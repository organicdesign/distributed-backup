# Distributed Backup

A distributed backup system running on Libp2p, IPFS and Welo.

## Warning

This project is still in development and had very little testing - data backed up using this system may be leaked or corrupted.

## Objectives

- Virtual distributed filesystem
- Automatic downloads
- Configurable multiplexed downloads
- Recording historical versions of files

## Environment

Nodejs will need to be installed to run this project, it has been tested on all long term supported (LTS) versions.

## Setup

### Enabling Fuse

The fuse package is disabled by default because it depends on the OS having FUSE installed. Fuse may already be installed by default on some linux distributions.

You can enable fuse by adding it to the `workspaces` value in `package.json`:

```json
"workspaces": [
	"packages/!(fuse|benchmarks)",
	"packages/fuse"
]
```

#### Linux

Building the fuse package depends on some system packages, install them by running the following command:

```
sudo apt-get install pkg-config libfuse-dev make build-essential
```

#### Mac with Apple Silicon

Do this before attempting to install the distributed backup or you will see errors at the install stage
1. Install macfuse. Eg. using homebrew: `brew install macfuse`
2. Enable and Activate Kernel Extensions: instructions can be found here https://www.makeuseof.com/how-to-enable-third-party-kernel-extensions-apple-silicon-mac/


### Compile

Note the install command will fail if dependencies are not installed, see the dependencies section for installing them.

Install dependencies:
```
npm ci
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

Then run the following command and follow the prompts to generate a configuration file:
```
node packages/scripts/dist/src/index generate-config config/config.json
```

### Generate Key File

You first need to generate a key for this server:
```
node packages/scripts/dist/src/index generate-keys config/key-a.json
```

Write down your mnemonic and name since this is what you will need to recover the server.

### Setting up FUSE on Mac with Apple Silicon

Do this before attempting to install the distributed backup or you will see errors at the install stage
1. Install macfuse. Eg. using homebrew: `brew install macfuse`
2. Enable and Activate Kernel Extensions: instructions can be found here https://www.makeuseof.com/how-to-enable-third-party-kernel-extensions-apple-silicon-mac/

## Quickstart Guide

Be sure to run the setup process first.

The system is setup in two parts - a client and a daemon, you will need to run the daemon first and then use it via CLI or FUSE.

You can add the `--help` flag to any script to get more help.

You can also add the `-s /path/to/socket` to configure where the socket file is located, this can be useful for running multiple daemons on the same machine.


Start the daemon with:

```
DEBUG=backup* node packages/daemon/dist/src/index.js -k config/key-a.json -c config/config.json
```

Now you can run the client to create a group:

```
GROUP=$(node packages/cli/dist/src/index.js create-group GROUP_NAME)
```

Once the group has been created you can add content to it.

```
CID=$(node packages/cli/dist/src/index.js import $GROUP <FILE OR DIRECTORY>)
```

Now that we have the daemon running with a group an content we can mount it to a directory with FUSE:

```
DEBUG=backup* node packages/fuse/dist/src/index.js --path /tmp/fuse --group $GROUP
```

After the group has been mounted through FUSE you can use it as you would a normal filesystem.

Now that one node is up and running you can run another one and join the group but first you must generate another related key using the same mnemonic when you created the first key:

```
node packages/scripts/dist/src/index generate-keys config/key-b.json --mnemonic "<MNEMONIC>"
```

Then you can start another daemon:

```
DEBUG=backup* node packages/daemon/dist/src/index.js -k config/key-b.json -c config/config.json --socket /tmp/peer2
```

Note that the `--socket` flag is only there so that we can run another node on the same machine.

Once the second daemon is running you need to connect them together, to do that first get the addresses from the first daemon like so:

```
node packages/cli/dist/src/index.js addresses
```

Then copy one of those addresses into the following command to connect the second daemon to the first:

```
node packages/cli/dist/src/index.js --socket /tmp/peer2 connect <ADDRESS>
```

Once the daemons are connected together you can join the group on the second:

```
node packages/cli/dist/src/index.js --socket /tmp/peer2 join-group $GROUP
```

Now that we have it joined the group it should start replicating and downloading the content from the first.

You can mount the other one in FUSE also like you did the first or you can list the content directly:

```
node packages/cli/dist/src/index.js --socket /tmp/peer2 list --group $GROUP
```

### Additional commands


#### Export Content from a Group

```
node packages/cli/dist/src/index.js export $GROUP <VIRTUAL PATH> <PATH TO EXPORT TO>
```

#### List All Content

```
node packages/cli/dist/src/index.js list
```

#### List All Groups

```
node packages/cli/dist/src/index.js list-groups
```

#### Join a Group

```
node packages/cli/dist/src/index.js join-group $GROUP
```

## Benchmarks

You can enable benchmarks by adding it to the `workspaces` value in `package.json`:

```json
"workspaces": [
	"packages/!(fuse|benchmarks)",
	"packages/benchmarks"
]
```

Then you can build the benchmarks package as usual:

```
npm ci
npm run build
```

For all benchmarks you can pass `--help` to the command to get a list of CLI arguments.

### Transfer

To run the transfer benchmark:

```
node packages/benchmarks/dist/src/transfer/index.js
```

### Import

To run the import benchmark:

```
node packages/benchmarks/dist/src/import/index.js
```
