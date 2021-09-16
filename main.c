#include <stdio.h>
#include <stdlib.h>
#include <openssl/sha.h>
#include <string.h>

int main(int argc, char *argv[]) {
	// Validate command line args
	if (argc < 3 || atoi(argv[1]) <= 0 || atoi(argv[2]) < 0) {
		printf("Usage: %s <BLOCK SIZE> <POSITION>\n", argv[0]);
		return 1;
	}

	// Convert command line args to integers.
	int blockSize = atoi(argv[1]);
	int position = atoi(argv[2]);

	// Prepare a buffer and open the file.
	unsigned char buffer[blockSize];
	FILE *ptr = fopen("./main.c", "rb");

	// Seek through file
	fseek(ptr, position, SEEK_SET);

	// Read file
	size_t readBytes = fread(buffer, 1, blockSize, ptr); // Read 'blockSize' amounts of 1 byte

	// Calculate hash
	unsigned char hash[SHA_DIGEST_LENGTH];
	SHA1(buffer, readBytes, hash);

	// Display hash
	printf("Hash: ");

	for(int i=0; i < SHA_DIGEST_LENGTH;i++) {
		printf("%02x", hash[i]);
	}

	printf("\n");


	return 0;
}
