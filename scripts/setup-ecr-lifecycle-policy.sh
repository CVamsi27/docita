#!/bin/bash

# ECR Lifecycle Policy Setup Script
# This script creates an ECR lifecycle policy for the docita-api repository
# to automatically clean up old images and reduce storage costs.

set -e

REPOSITORY_NAME="docita-api"
AWS_REGION="us-west-1"
POLICY_FILE="$(dirname "$0")/ecr-lifecycle-policy.json"

echo "🚀 Setting up ECR lifecycle policy for repository: $REPOSITORY_NAME"
echo "📍 Region: $AWS_REGION"
echo "📄 Policy file: $POLICY_FILE"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed"
    echo "Please install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if policy file exists
if [ ! -f "$POLICY_FILE" ]; then
    echo "❌ Error: Policy file not found: $POLICY_FILE"
    exit 1
fi

# Verify AWS credentials are configured
echo "🔐 Verifying AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: AWS credentials not configured or invalid"
    echo "Please configure AWS CLI: aws configure"
    exit 1
fi

# Check if repository exists
echo "🔍 Checking if repository exists..."
if ! aws ecr describe-repositories \
    --repository-names "$REPOSITORY_NAME" \
    --region "$AWS_REGION" &> /dev/null; then
    echo "❌ Error: Repository '$REPOSITORY_NAME' not found in region '$AWS_REGION'"
    exit 1
fi

# Apply lifecycle policy
echo "📝 Applying lifecycle policy..."
aws ecr put-lifecycle-policy \
    --repository-name "$REPOSITORY_NAME" \
    --region "$AWS_REGION" \
    --lifecycle-policy-text "file://$POLICY_FILE" \
    --no-cli-pager

if [ $? -eq 0 ]; then
    echo "✅ Lifecycle policy successfully applied!"
    echo ""
    echo "📊 Policy Summary:"
    echo "  • Keep last 5 tagged images (prefixes: v, main, prod, latest)"
    echo "  • Expire untagged images after 7 days"
    echo "  • Keep last 50 images total (cleans up old SHA tags)"
    echo "  • Expected cost reduction: ~90%"
    echo ""
    echo "🔍 To view the policy:"
    echo "  aws ecr get-lifecycle-policy --repository-name $REPOSITORY_NAME --region $AWS_REGION"
    echo ""
    echo "📈 To preview what will be deleted (dry run):"
    echo "  aws ecr get-lifecycle-policy-preview --repository-name $REPOSITORY_NAME --region $AWS_REGION"
else
    echo "❌ Failed to apply lifecycle policy"
    exit 1
fi
