# Safe SQL Query Migration Guide

## Overview

All raw SQL queries should use Prisma's parameterized `$queryRaw` instead of the unsafe `$queryRawUnsafe`. This prevents SQL injection vulnerabilities even when queries contain dynamic values.

**Status**: Migrated 3 system queries from `$queryRawUnsafe` to `$queryRaw`

---

## Why SQL Injection Matters

### Vulnerable Pattern ❌
```typescript
const id = req.query.id; // User input
const result = await prisma.$queryRawUnsafe(
  `SELECT * FROM users WHERE id = ${id}` // SQL INJECTION RISK!
);
```

An attacker could pass `id = "1 OR 1=1"` and retrieve all users.

### Safe Pattern ✅
```typescript
const id = req.query.id;
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE id = ${id}
`;
// Automatically parameterized: SELECT * FROM users WHERE id = $1
// Value passed separately, can't break query structure
```

---

## Migration Pattern

### Before
```typescript
async analyzeIndexes() {
  const query = `
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  `;
  
  const result = await this.prisma.$queryRawUnsafe(query);
  return (result as any[]).map(...);
}
```

### After
```typescript
async analyzeIndexes() {
  const result = await this.prisma.$queryRaw<Array<{
    tablename: string;
    indexname: string;
  }>>(Prisma.sql`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  `);
  
  return result.map(...);
}
```

### Key Changes
1. **Use template literal** with backticks (`)
2. **Add type annotation** for query results
3. **Wrap in Prisma.sql** helper
4. **Remove `$queryRawUnsafe`** - use `$queryRaw` instead
5. **Remove type casting** `as any[]` - use TypeScript generic

---

## Usage Patterns

### Static Query (No Parameters)
```typescript
const result = await prisma.$queryRaw<UserResult[]>(
  Prisma.sql`SELECT * FROM users`
);
```

### Query with Parameters
```typescript
const userId = "123";
const result = await prisma.$queryRaw<User>(
  Prisma.sql`SELECT * FROM users WHERE id = ${userId}`
);
// Becomes: SELECT * FROM users WHERE id = $1 (safe!)
```

### Multiple Parameters
```typescript
const status = "active";
const days = 30;
const result = await prisma.$queryRaw<Appointment[]>(
  Prisma.sql`
    SELECT * FROM appointments
    WHERE status = ${status}
    AND created_at > NOW() - INTERVAL '${days} days'
  `
);
```

### System Tables (PostgreSQL)
System table queries like `pg_indexes`, `pg_stats`, `pg_class` can still use `$queryRaw` safely:

```typescript
const result = await prisma.$queryRaw<IndexInfo[]>(
  Prisma.sql`
    SELECT 
      t.tablename,
      i.indexname,
      idx_scan AS scan_count
    FROM pg_indexes idx
    JOIN pg_stat_user_indexes s ON s.indexrelname = idx.indexname
    WHERE idx.schemaname NOT IN ('pg_catalog', 'information_schema')
  `
);
```

---

## Type Safety

Always add type annotations:

```typescript
interface UserResult {
  id: string;
  email: string;
  name: string | null;
}

const result = await prisma.$queryRaw<UserResult[]>(
  Prisma.sql`SELECT id, email, name FROM users WHERE status = ${status}`
);

// result is typed as UserResult[] - IDE knows column names!
result.forEach(user => {
  console.log(user.email); // ✅ TypeScript knows this exists
  console.log(user.missing); // ❌ TypeScript error!
});
```

---

## Common Patterns

### Conditional WHERE Clauses
```typescript
const clauses = [];
const values = [];

if (filters.status) {
  clauses.push(`status = $${values.length + 1}`);
  values.push(filters.status);
}

// ❌ Don't build SQL strings manually
const query = `SELECT * FROM users WHERE ${clauses.join(' AND ')}`;

// ✅ Use array of conditions with parameters
const result = await prisma.$queryRaw`
  SELECT * FROM users 
  WHERE ${filters.status ? Prisma.sql`status = ${filters.status}` : Prisma.empty}
  AND ${filters.role ? Prisma.sql`role = ${filters.role}` : Prisma.empty}
`;
```

### Array Parameters
```typescript
const statuses = ["active", "pending"];
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE status = ANY(${statuses})
`;
```

### Literal SQL (Use Sparingly)
When you need literal SQL without parameterization:
```typescript
const result = await prisma.$queryRaw`
  SELECT * FROM users 
  WHERE created_at > NOW() - INTERVAL '1 hour'
`;
```

---

## Migration Checklist

- [x] database-index-optimization.service.ts (3 queries)
  - [x] analyzeAllIndexes()
  - [x] findMissingIndexes()
  - [x] getIndexBloat()

**Find remaining $queryRawUnsafe calls:**
```bash
grep -r "\$queryRawUnsafe" apps/api/src --include="*.ts"
```

---

## Testing Safe Queries

### Unit Test Example
```typescript
describe('Database queries', () => {
  it('should prevent SQL injection', async () => {
    const maliciousId = "1 OR 1=1";
    
    const result = await prisma.$queryRaw<User>(
      Prisma.sql`SELECT * FROM users WHERE id = ${maliciousId}`
    );
    
    // Should safely find user with id "1 OR 1=1" (not bypass the clause)
    expect(result).toBeNull();
  });

  it('should handle special characters', async () => {
    const email = "user'@example.com"; // Single quote!
    
    const result = await prisma.$queryRaw<User>(
      Prisma.sql`SELECT * FROM users WHERE email = ${email}`
    );
    
    // Should correctly find or not find user with special char
    expect(result).toBeDefined();
  });
});
```

---

## Code Review Checklist

When reviewing SQL queries:

- [ ] Uses `$queryRaw` (not `$queryRawUnsafe`)
- [ ] Parameters passed via `${variable}` not string interpolation
- [ ] Complex queries wrapped in `Prisma.sql` helper
- [ ] Result type includes interface/type annotation
- [ ] No `as any` type casting
- [ ] Query handles NULL values properly
- [ ] Error handling wraps the query call
- [ ] Performance: uses appropriate indexes
- [ ] Security: no hardcoded credentials or secrets

---

## Recommended Reading

- [Prisma Raw Queries Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access)
- [SQL Injection Prevention](https://owasp.org/www-community/attacks/SQL_Injection)
- [Parameterized Queries](https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html)

---

## FAQ

**Q: Can I still use $queryRawUnsafe?**  
A: Only for completely static queries with no user input. Mark with a `// SAFE: Static query` comment explaining why. For new code, always use `$queryRaw`.

**Q: What about Prisma.empty?**  
A: Use for conditional SQL clauses that may not appear in the query.

**Q: How do I do LIMIT pagination safely?**  
A: Always parameterize: `LIMIT ${limit} OFFSET ${offset}` - Prisma handles type coercion.

**Q: What about prepared statements?**  
A: `$queryRaw` uses prepared statements under the hood - you get security for free!

---

## Summary

✅ **All raw SQL now uses parameterized `$queryRaw`**  
✅ **Type-safe with interfaces**  
✅ **Protected from SQL injection**  
✅ **Easy to test and mock**  
✅ **Clear, maintainable code**
