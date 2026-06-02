# API artifacts

`openapi.json` is a generated release artifact, not a checked-in source file.

Generate it after route or DTO changes with:

```bash
pnpm openapi:generate
```

The canonical HTTP contracts remain the shared Zod schemas in
`packages/types`. Publish the generated OpenAPI document with release
artifacts when an external consumer needs a snapshot.
