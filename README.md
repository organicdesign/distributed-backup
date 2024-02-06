# Distributed Backup

A distributed backup system running on Libp2p, IPFS and Welo.

## Environment

nodejs will need to be installed to run this project, it has been tested on v18, v20 has typescript issues.

## Setup

### Compile

Note for Mac users: you should first install Macfuse - see instructions later this section

Install dependencies:
```
npm i
```

Build:
```
npm run build
```

### Generate Config

You will need to create a configuration directory:
```
mkdir config
```

Then create a configuration file similar to the following and save it to your config directory:
```json
{
	"private": false,
	"serverMode": false,
	"tickInterval": 0.1,
	"storage": "/path/to/data",
	"defaultRevisionStrategy": "log",
	"addresses": [ "/ip4/0.0.0.0/tcp/0" ],
	"bootstrap": []
}
```

You can use `:memory:` if you want all data to be stored in memory instead of the disk.

### Generate Key File

You first need to generate a key for this server:
```
node packages/scripts/dist/src/index generate-keys config/key.json
```

Write down your mnemonic and name since this is what you will need to recover the server.

### Setting up FUSE on Mac with Apple Silicon

Do this before attempting to install the distributed backup or you will see errors at the install stage
1. Install macfuse. Eg. using homebrew: `brew install macfuse`
2. Enable and Activate Kernel Extensions: instructions can be found here https://www.makeuseof.com/how-to-enable-third-party-kernel-extensions-apple-silicon-mac/


## Running

The system is setup in two parts - a client and a daemon, you will need to run the daemon first and then use it via the client.

You can add the `--help` flag to any script to get more help.

You can also add the `-s /path/to/socket` to configure where the socket file is located, this can be useful for running multiple daemons on the same machine.

### Daemon
Start the daemon with:

```
DEBUG=backup* node packages/daemon/dist/src/index.js -k config/key.json -c config/config.json
```

### Client

#### Create a Group

```
GROUP=$(node packages/client/dist/src/index.js create-group GROUP_NAME)
```

#### Join a Group

```
node packages/client/dist/src/index.js join-group $GROUP
```

#### Add Content to a Group

```
CID=$(node packages/client/dist/src/index.js add $GROUP <FILE OR DIRECTORY>)
```

#### Export Content from a Group

```
node packages/client/dist/src/index.js export $CID <PATH TO EXPORT TO>
```

#### List All Content

```
node packages/client/dist/src/index.js list
```

#### List All Groups

```
node packages/client/dist/src/index.js list-groups
```

### FUSE

```
DEBUG=backup* node packages/fuse/dist/src/index.js --path /tmp/fuse --group $GROUP
```
