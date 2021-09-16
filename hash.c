#include <stdio.h>
#include <openssl/sha.h>
#include <string.h>

int main(int argc, char *argv[]) {
	// Validate command line args
	if (argc < 2) {
		printf("Usage: %s <STRING TO HASH>\n", argv[0]);
		return 1;
	}

	// Calculate hash
	unsigned char hash[SHA_DIGEST_LENGTH];
	SHA1(argv[1], strlen(argv[1]), hash);

	// Display hash
	for(int i=0; i < SHA_DIGEST_LENGTH;i++) {
		printf("%02x", hash[i]);
	}

	return 0;
}
