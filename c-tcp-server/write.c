#include <stdio.h>
#include <stdlib.h>
#include <errno.h>

#ifndef WRITE_C
#define WRITE_C

int writeSection (unsigned char* buffer, FILE* ptr, int chunkSize, int position) {
	size_t writtenBytes;
	int i;

	// Seek through file
	if (fseek(ptr, position, SEEK_SET) < 0 ) {
		printf("Failed to seek file. (%i)\n", errno);
		return -1;
	}

	// Read file
	writtenBytes = fwrite(buffer, 1, chunkSize, ptr);

	if (ferror(ptr)) {
		printf("Failed to read file. (%i)\n", errno);
		return -1;
	}

	return writtenBytes;
}

#endif
