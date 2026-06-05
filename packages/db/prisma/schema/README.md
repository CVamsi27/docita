# `prisma/schema/` — retired topic decomposition

The single source of truth is [`../schema.prisma`](../schema.prisma).
The historical hand-maintained topic snapshots were removed because they
could drift from the schema consumed by Prisma. Use:

```bash
rg "^model <ModelName>" ../schema.prisma
rg "^enum <EnumName>" ../schema.prisma
```

Add a generated navigation artifact only if it is derived automatically from
`schema.prisma`.
