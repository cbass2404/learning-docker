# Docker

[Docker Documentation](https://docs.docker.com/)

## Overview

Traditional application deployment requires packaging application source code into an artifact and deploying it to a server that has a compatible operating system, runtime and other dependant libraries.

Docker exists to address these issues. Docker bundles runtime dependencies with application source code into an image - creating a unified experience whether an application is being run on a developer's workstation or a production server.

## VMs vs Docker Containers

Virtual machines (VM) are an abstraction of a physical server turning one server into many. A hypervisor is installed on the host server allowing multiple VMs to run on a single machine. Each VM includes a full copy of an operating system (OS) making it resource intensive to run and slow to boot.

Containers are an abstraction at the app layer that packages application artifacts and dependencies together. The fundamental difference is containers share the same host operating system, but each container runs in it's own isolated process controlled by the Docker Engine. Containers are more lightweight than VMs and typically boot in seconds instead of minutes.

## Dockerfiles, Images and Containers

A Dockerfile is used to build a Docker image. It is a plain-text file that contains a series of instructions telling Docker what operating system, application dependencies and application source code is required to run the application.

A Docker image is a static artifact that is built from a Dockerfile and is tagged and published to a registry where it can be shared.

A Docker container is a running instance of a Docker image.

## Review

Docker images combine source code with the dependencies required to run an application. Images are built from Dockerfiles and are more lightweight and portable than traditional VMs making them great for both developers and operators.

## Layout

- The first line of any dockerfile, which should be in the root directory of the app, should be a FROM command. This tells npm what to use and what version to use for the VM. Allowing the rest of the document to focus entirely on instructing the app itself and not versions

```Dockerfile
FROM node:15
```

- The next step is to establish the variables for the docker file during buildtime and runtime. It is best practice to put these two together.
  - ARG sets the variables used during buildtime
  - ENV sets the variables used during runtime

```Dockerfile
ARG PORT=8000
ENV PORT=$PORT
```

- Next you select the name you want docker to build into

```Dockerfile
WORKDIR /app
```

- Tell it which folders to copy

```Dockerfile
COPY src src
COPY package.json .
```

- Pass it the install command to run on build

```Dockerfile
RUN npm install
```

- Finally give it the port to expose and the command to execute startup

```Dockerfile
EXPOSE $PORT

CMD npm start
```

- Build and run the image with the following command

```
$ docker build -t imageName:version location
// $ docker build -t my-node-app:latest .
```

- View your created image with the following command

```
$ docker image ls
```

- Run image with the following command

```
$ docker run --name my-container -p 8000:8000 -d my-node-app:latest
```

```
$ docker ps
```

_To view all running docker containers_

```
$ docker logs my-container
```

_To view all logs for a container_

```
$ docker rm -f my-container
```

_To shut down a running container_

- To customize environment variables add a -e flag for environment

```
$docker run --name my-container -e PORT=9000 -p 8000:9000 -d my-node-all:latest
```

## Volumes for development

### Overview

With the concepts we've explored so far, running a containerized service with Docker when trying to make code changes would be incredibly inefficient. To test every code change, a developer would have to

1. Make the code change
2. Stop the container (docker rm -f ...)
3. Rebuild the image (docker build ...)
4. Run the container (docker run ...)

In particular, rebuilding an image with docker build takes too long. We're going to explore how to make things much more efficient.

### Volumes

A Docker container has no built in persistence. Beyond what is built in to an image during the build phase, all other data is discarded when a container is destroyed. Without volumes, running databases or applications that require state would be impossible.

Volumes provide a persistent storage mechanism that can be managed through Docker's CLI. They can be shared between multiple containers and can be stored on remote hosts or cloud providers.

Consider the following example:

```
$ docker volume create my-vol
$ docker run -v my-vol:/data my-image
```

The above commands create a volume called my-vol and on container creation is mounted to the /data directory. As the application runs, the contents of /data are persisted in the volume so that when the container is destroyed, the data is not lost.
[Official Docs](https://docs.docker.com/storage/volumes/)

### Bind Mounts

Bind mounts are similar to volumes, but in comparison have limited functionality. Instead of creating a named volume, the contents of a host machine's directory can be mounted to a directory in a container.

For example the following command will overwrite the contents of the /data directory in the container with the contents of /Users/connor/data. When the container is running, the contents are mirrored between the two locations regardless if a change originates from the container or the host machine.

docker run -v /Users/connor/data:/data my-image

The only catch is the host machine directory must be an absolute path.
[Official Docs](https://docs.docker.com/storage/bind-mounts/)

### Local Development

The most common use case for bind mounts is in local development environments. Instead of rebuilding an image on every code change, we can mount our application's src/ directory to the /app/src directory of our container.

Open a terminal at the root of your application and run

```
$docker run --name my-container -p 8000:8000 -d -v $PWD/src:/app/src my-node-app:latest
```

Verify it's working by going to localhost:8000 in your browser. You should see Hello World!.

Now open src/index.js and change line 6 from

```js
res.send('Hello World!');
```

to

```js
res.send('Hello Bitovi!');
```

save the file and refresh your browser. It should now say Hello Bitovi!.

What's happening is the nodemon process is watching the src/ directory in the container for changes. Because our host-machine's src/ directory is mounted to the container's app/src/ directory (-v $PWD/src:/app/src), when we save the change to index.js, it is replicated in the container causing nodemon to restart the server. We can see this in the container logs:

```
$ docker logs my-container

> bitovi-academy-app@1.0.0 start
> nodemon src/index.js

[nodemon] 2.0.6
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): _._
[nodemon] watching extensions: js,mjs,json
[nodemon] starting `node src/index.js`
Example app listening at http://localhost:8000
[nodemon] restarting due to changes...
[nodemon] starting `node src/index.js`
Example app listening at http://localhost:8000
```

This approach means we only need to build an image once
