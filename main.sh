FILENAME="read.c";
BLOCKSIZE=100;

size=$(stat -c%s "$FILENAME");

for ((i=0; i<=size; i+= BLOCKSIZE)); do
	IFS= read -rd '' RESULT < <( ./read $FILENAME $BLOCKSIZE $i );
	#echo -n "$RESULT"
	echo -n "$RESULT" | sha1sum;
done
