#include <stdio.h>
#include <stdlib.h>
#include <openssl/sha.h>
#include <string.h>

int main(int argc, char *argv[]) {
	int blockSize = 100;
	int position = 0;

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
