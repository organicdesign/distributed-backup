#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[]) {
	// Validate command line args
	if (argc < 4 || atoi(argv[2]) <= 0 || atoi(argv[3]) < 0) {
		printf("Usage: %s <FILENAME> <BLOCK SIZE> <POSITION>\n", argv[0]);
		return 1;
	}

	// Convert command line args to integers.
	int blockSize = atoi(argv[2]);
	int position = atoi(argv[3]);

	// Prepare a buffer and open the file.
	unsigned char buffer[blockSize];
	FILE *ptr = fopen(argv[1], "rb");

	// Seek through file
	fseek(ptr, position, SEEK_SET);

	// Read file
	size_t readBytes = fread(buffer, 1, blockSize, ptr); // Read 'blockSize' amounts of 1 byte

	// Display the bytes.
	for (int i = 0; i < readBytes; i++)
		printf("%c", buffer[i]); // prints a series of bytes

	return 0;
}
