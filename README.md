# distributed-backup

Backup for distributed servers.

# Run
```bash
sudo apt-get install libssl-dev
gcc -o main main.c -lcrypto -D_FILE_OFFSET_BITS == 64
./main
```

Server/client:
```bash
gcc \
	-o client \
	client.c \
	-lcrypto && \
gcc \
	-o server \
	server.c \
	-lcrypto \
	-D_FILE_OFFSET_BITS=64 \
	-Doff64_t=__off64_t
```
