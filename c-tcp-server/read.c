#include <stdio.h>
#include <stdlib.h>
#include <errno.h>

#ifndef READ_C
#define READ_C

int readSection (unsigned char* buffer, char* filename, int chunkSize, int position) {
	size_t readBytes;
	int i;
	FILE *ptr;

	// Open file
	ptr = fopen(filename, "rb");

	if (ptr == NULL) {
		printf("Failed to open file. (%i)\n", errno);
		return -1;
	}

	// Seek through file
	if (fseek(ptr, position * chunkSize, SEEK_SET) < 0 ) {
		printf("Failed to seek file. (%i)\n", errno);
		return -1;
	}

	// Read file
	readBytes = fread(buffer, 1, chunkSize, ptr);

	if (ferror(ptr)) {
		printf("Failed to read file. (%i)\n", errno);
		return -1;
	}

	if (fclose(ptr) != 0) {
		printf("Failed to close file. (%i)\n", errno);
		return -1;
	}

	return readBytes;
}

#endif
