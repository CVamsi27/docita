#!/bin/bash
# Safe Migration Script for Docita
# This script ensures safe database migrations with backup and validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="./logs/migration_${TIMESTAMP}.log"

# Ensure directories exist
mkdir -p "$BACKUP_DIR" logs

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to normalize database URL values from env files or direct secrets.
normalize_db_url() {
    local value="${1:-}"
    value="${value#DATABASE_URL=}"

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
        value="${value#\"}"
        value="${value%\"}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
        value="${value#\'}"
        value="${value%\'}"
    fi

    printf '%s\n' "$value"
}

# Function to get database URL
get_db_url() {
    if [ -f ".env" ]; then
        source .env
    fi
    normalize_db_url "${DATABASE_URL:-}"
}

# Function to extract database name from URL
get_db_name() {
    local url=$1
    echo "$url" | sed -E 's/.*\/([^?]+).*/\1/'
}

# Function to check if we're in production
is_production() {
    if [[ "$DATABASE_URL" == *"prod"* ]] || [[ "$NODE_ENV" == "production" ]]; then
        return 0
    fi
    return 1
}

is_ci() {
    if [[ "$CI" == "true" ]] || [[ "$GITHUB_ACTIONS" == "true" ]]; then
        return 0
    fi
    return 1
}

# Function to create a backup
get_pg_dump_major_version() {
    if ! command -v pg_dump &> /dev/null; then
        printf '%s\n' ""
        return 0
    fi

    pg_dump --version | awk '{print $3}' | cut -d. -f1
}

get_server_major_version() {
    local db_url
    db_url=$(get_db_url)

    if ! command -v psql &> /dev/null; then
        printf '%s\n' ""
        return 0
    fi

    local server_version_num
    server_version_num=$(psql --dbname="$db_url" -Atqc "SHOW server_version_num;" 2>/dev/null || true)
    if [ -z "$server_version_num" ]; then
        printf '%s\n' ""
        return 0
    fi

    printf '%s\n' "$((server_version_num / 10000))"
}

create_backup() {
    local db_url=$(get_db_url)
    local db_name=$(get_db_name "$db_url")
    local backup_file="${BACKUP_DIR}/${db_name}_${TIMESTAMP}.sql"
    
    log "Creating database backup..."
    
    if command -v pg_dump &> /dev/null; then
        local pg_dump_major
        local server_major
        pg_dump_major=$(get_pg_dump_major_version)
        server_major=$(get_server_major_version)

        if [ -n "$pg_dump_major" ] && [ -n "$server_major" ] && [ "$pg_dump_major" -lt "$server_major" ]; then
            warn "Skipping backup because pg_dump ${pg_dump_major} is older than PostgreSQL ${server_major}."
            echo ""
            return 0
        fi

        pg_dump --dbname="$db_url" > "$backup_file"
        success "Backup created: $backup_file"
        echo "$backup_file"
    else
        warn "pg_dump not found. Skipping backup."
        echo ""
    fi
}

# Function to validate migration files
validate_migration() {
    local migration_dir="./prisma/migrations"
    local latest_migration=$(ls -t "$migration_dir" | head -1)
    local migration_file="${migration_dir}/${latest_migration}/migration.sql"
    
    if [ ! -f "$migration_file" ]; then
        error "Migration file not found: $migration_file"
        return 1
    fi
    
    log "Validating migration: $latest_migration"
    
    # Check for dangerous operations
    local dangerous_patterns=(
        "DROP TABLE"
        "DROP COLUMN"
        "TRUNCATE"
        "DELETE FROM.*WHERE 1=1"
        "ALTER.*TYPE.*USING"
    )
    
    local warnings=0
    for pattern in "${dangerous_patterns[@]}"; do
        if grep -qi "$pattern" "$migration_file"; then
            warn "Potentially dangerous operation found: $pattern"
            warnings=$((warnings + 1))
        fi
    done
    
    if [ $warnings -gt 0 ]; then
        warn "Found $warnings potentially dangerous operations"
        if is_production; then
            if is_ci; then
                error "Production migrations with dangerous operations are blocked in CI. Review the migration before deploying."
                return 1
            fi

            error "Production migrations with dangerous operations require manual approval"
            read -p "Do you want to continue? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                exit 1
            fi
        fi
    else
        success "Migration validation passed"
    fi
    
    return 0
}

# Function to check data integrity
check_data_integrity() {
    log "Checking data integrity..."

    # Reuse the adapter-aware integrity script and preserve its exit code when logging.
    pnpm run db:check-integrity 2>&1 | tee -a "$LOG_FILE"
    local integrity_status=${PIPESTATUS[0]}

    if [ "$integrity_status" -eq 0 ]; then
        success "Data integrity check passed"
        return 0
    else
        error "Data integrity check failed"
        return 1
    fi
}

# Function to run migration
run_migration() {
    local mode=$1
    
    log "Running migration in $mode mode..."
    
    case $mode in
        "dev")
            npx prisma migrate dev
            ;;
        "deploy")
            npx prisma migrate deploy
            ;;
        "dry-run")
            log "Dry run - showing pending migrations..."
            npx prisma migrate status
            ;;
        *)
            error "Unknown migration mode: $mode"
            return 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        success "Migration completed successfully"
        return 0
    else
        error "Migration failed"
        return 1
    fi
}

# Function to rollback (restore from backup)
rollback() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        # Find latest backup
        backup_file=$(ls -t "$BACKUP_DIR"/*.sql 2>/dev/null | head -1)
    fi
    
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        error "No backup file found for rollback"
        return 1
    fi
    
    warn "Rolling back to: $backup_file"
    read -p "Are you sure you want to rollback? This will overwrite current data. (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Rollback cancelled"
        return 0
    fi
    
    local db_url=$(get_db_url)
    psql --dbname="$db_url" < "$backup_file"
    
    if [ $? -eq 0 ]; then
        success "Rollback completed"
        return 0
    else
        error "Rollback failed"
        return 1
    fi
}

# Function to generate migration
generate_migration() {
    local name=$1
    
    if [ -z "$name" ]; then
        error "Migration name required"
        echo "Usage: $0 generate <migration_name>"
        return 1
    fi
    
    log "Generating migration: $name"
    npx prisma migrate dev --name "$name" --create-only
    
    if [ $? -eq 0 ]; then
        success "Migration generated. Please review before applying."
        log "Review the migration file in prisma/migrations/"
        return 0
    else
        error "Failed to generate migration"
        return 1
    fi
}

# Main execution
main() {
    local command=${1:-"help"}
    shift || true
    
    cd "$(dirname "$0")/.." || exit 1
    
    log "=========================================="
    log "Docita Safe Migration Tool"
    log "=========================================="
    
    case $command in
        "backup")
            create_backup
            ;;
        "validate")
            validate_migration
            ;;
        "check")
            check_data_integrity
            ;;
        "generate")
            generate_migration "$@"
            ;;
        "dev")
            create_backup
            validate_migration
            run_migration "dev"
            check_data_integrity
            ;;
        "deploy")
            if is_production && ! is_ci; then
                warn "PRODUCTION DEPLOYMENT DETECTED"
                read -p "Are you sure you want to deploy to production? (yes/no): " confirm
                if [ "$confirm" != "yes" ]; then
                    exit 0
                fi
            fi
            create_backup
            validate_migration
            run_migration "deploy"
            check_data_integrity
            ;;
        "dry-run")
            validate_migration
            run_migration "dry-run"
            ;;
        "rollback")
            rollback "$@"
            ;;
        "status")
            npx prisma migrate status
            ;;
        "help"|*)
            echo ""
            echo "Docita Safe Migration Tool"
            echo ""
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  backup           Create a database backup"
            echo "  validate         Validate pending migration files"
            echo "  check            Run data integrity checks"
            echo "  generate <name>  Generate a new migration (review before applying)"
            echo "  dev              Run migration in development mode (with backup)"
            echo "  deploy           Run migration in production mode (with backup & validation)"
            echo "  dry-run          Show pending migrations without applying"
            echo "  rollback [file]  Rollback to a backup file"
            echo "  status           Show migration status"
            echo "  help             Show this help message"
            echo ""
            ;;
    esac
}

main "$@"
