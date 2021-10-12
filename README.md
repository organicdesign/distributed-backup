# distributed-backup

Backup for distributed servers.

# Install
```bash
npm i;
node test-service.js;
node transfer.js;
```

# Generate proof
To generate a proof for the content in a file:
```bash
cat file | node generate-proof <HASH>
# Or to generate a proof based of a passphrase "Phrase":
cat file | node generate-proof $(echo -n "Phrase" | sha256sum | sed s/[\ ]*-//g);
```
