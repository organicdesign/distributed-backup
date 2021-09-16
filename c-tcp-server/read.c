#include <stdio.h>
#include <stdlib.h>
#include <errno.h>

#ifndef READ_C
#define READ_C

int readSection (unsigned char* buffer, char* filename, int blockSize, int position) {
	FILE *ptr = fopen(filename, "rb");
	size_t readBytes;
	int i;

	if (ptr == NULL) {
		printf("Failed to open file. (%i)\n", errno);
		return -1;
	}

	// Seek through file
	if (fseek(ptr, position * blockSize, SEEK_SET) < 0 ) {
		printf("Failed to seek file. (%i)\n", errno);
		return -1;
	}

	// Read file
	readBytes = fread(buffer, 1, blockSize, ptr);

	if (ferror(ptr)) {
		printf("Failed to read file. (%i)\n", errno);
		return -1;
	}

	// Display the bytes.
	for (i = 0; i < readBytes; i++)
		printf("%c", buffer[i]); // prints a series of bytes

	printf("\n");

	return readBytes;
}

#endif
