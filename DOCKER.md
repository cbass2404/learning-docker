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
[Docker Hub](https://hub.docker.com/)

### Local Development

The most common use case for bind mounts is in local development environments. Instead of rebuilding an image on every code change, we can mount our application's src/ directory to the /app/src directory of our container.

Open a terminal at the root of your application and run

```
$ docker run --name my-container -p 8000:8000 -d -v $PWD/src:/app/src my-node-app:latest
```

Verify it's working by going to localhost:8000 in your browser. You should see Hello World!.

Now open src/index.js and change line 6 from

```js
res.send("Hello World!");
```

to

```js
res.send("Hello Bitovi!");
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

## Production Readiness

### Overview

We want to make our image as lightweight as possible. Reducing image size will make it faster to pull and run in production. In its current state, our simple node app is a staggering 944MB!

```d
$ docker image ls my-node-app
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
my-node-app         latest              78ef31600011        7 seconds ago       944MB
```

We're going to explore 2 simple ways to make our image small and ready for production.

Base Image Variants
The simplest and most significant change is updating the FROM instruction in our Dockerfile. The node:15 image is 935MB. That's 99% of our image!

```
$ docker image ls node
REPOSITORY TAG IMAGE ID CREATED SIZE
node 15 969d445a1755 6 days ago 935MB
```

Docker provides a set of official images that are designed to provide drop-in solutions for popular runtimes and services. Many of these images provide variants of the image based on a developer's requirements. The node image repository on Dockerhub has 3 main variants:

- node:<version>: This is the standard image that contains everything you'll need to run node. It's often the default choice if your specific needs and requirements are unclear. It's also the largest of all the variants
- node:<version>-slim: The "slim" variant contains only the necessary packages needed to run node. It is a good choice if your image only requires node and can operate without other external dependencies like gcc.
- node:<version>-alpine: Instead of using debian as the base image, The alpine variant uses Alpine Linux. The alpine Docker image is designed to be as minimal as possible at only 5MB in size.
  Pulling these images into our local registry from Dockerhub using docker pull, allows us to inspect the size difference between the node variants

```
$ docker pull node:15
$ docker pull node:15-slim
$ docker pull node:15-alpine
$ docker image ls node
REPOSITORY TAG IMAGE ID CREATED SIZE
node 15-slim 4b7012d853dc 6 days ago 159MB
node 15 969d445a1755 6 days ago 935MB
node 15-alpine 7ddc154413f5 7 days ago 109MB
```

As you can see, node:15-slim is 159MB, a fraction of the size of node:15. Meanwhile, node:15-alpine is even smaller at 109MB. As a general rule, you'll want to use the smallest base image that meets your needs.

Updating our FROM instruction
Update FROM node:15 in our Dockerfile to FROM node:15-alpine. The whole file should now look like this:

```dockerfile
FROM node:15-alpine

ARG PORT=8000
ENV PORT=$PORT

WORKDIR app
COPY src src
COPY package.json .

RUN npm install
EXPOSE $PORT
CMD npm start
```

Now rebuild the image with an alpine tag

```
$ docker build -t my-node-app:alpine .
```

Finally, lets compare the difference:

```
$ docker image ls my-node-app
REPOSITORY TAG IMAGE ID CREATED SIZE
my-node-app alpine a86e7ef34019 12 seconds ago 118MB
my-node-app latest 78ef31600011 18 minutes ago 944MB
```

By using the alpine node image variant, we've reduced the total image size by 87.5%!

Multi-Stage Builds
We are using npm install to install application dependencies during the Docker build phase. By default, npm install installs both standard and dev dependencies. We want to conditionally install all dependencies when building for local development, but only download standard dependencies with npm install --only=prod when building to run in production.

A multi-stage build is a Dockerfile with multiple FROM instructions. This is typically done to keep the final image size down by separating what is required to build an application from what is required to run it by allowing selective artifacts to be copied from one stage to another.

This is especially powerful in compiled languages like Go or Java where multi-stage builds can be used to have your first stage compile the source code into a runtime artifact and then only the runtime artifact is copied in to a leaner final image.

Targets
By using the --target cli argument when building our image, we can tell Docker to stop building at a specific stage. We will use this alone with a prod stage and a dev stage to give us our desired result.

Replace our node app's Dockerfile to the following:

```dockerfile
FROM node:15-alpine as prod
ARG PORT=8000
ENV PORT=$PORT

WORKDIR app
COPY src src
COPY package.json .

RUN npm install --only=prod
EXPOSE $PORT
CMD npm run start:prod

FROM prod as dev
RUN npm install --only=dev
CMD npm start
```

Most of the Dockerfile remains the same with some notable exceptions:

-FROM node:15-alpine as prod: We added as prod here to give our stage a name.
-RUN npm install --only=prod: We added --only=prod to tell npm to ignore dev dependencies when building for production.
-CMD npm run start:prod: We updated our CMD to start:prod to run our app with node instead of nodemon. start:prod is defined in package.json
-FROM prod as dev: We are starting a new stage called dev and using our prod stage as the base image.
-RUN npm install --only=dev: Install only dev dependencies because we've already installed standard dependencies in the prerequisite prod stage
-CMD npm start: Start the container with nodemon
Now when building our image, we can provide --target=prod or --target=dev to customize our final image. If we run docker build without the --target flag, it will run all stages by default, but we will be explicit with --target=dev

```
# Build our prod image
$ docker build -t my-node-app:prod --target=prod .

# Build our dev image
$ docker build -t my-node-app:dev --target=dev .


# Compare the results
$ docker image ls my-node-app
REPOSITORY TAG IMAGE ID CREATED SIZE
my-node-app dev 57966959f28a 13 seconds ago 118MB
my-node-app prod 739cd7430f03 25 seconds ago 115MB
my-node-app alpine a86e7ef34019 54 minutes ago 118MB
my-node-app latest 78ef31600011 About an hour ago 944MB
```

The savings in size we see in this example are trivial (3MB) because we only have the one dev dependency (nodemon). The savings and complexity added from utilizing multi-stage builds increases as the number of dependencies increases. Running nodemon is also more memory and cpu intensive so there are also underlying performance savings with this approach.

There are a lot of powerful things you can do with multi-stage builds. Check out the Official Docs for more inspiration.

Test our images
Let's run both prod and dev images to make sure they work. Notice when we run our prod image, we don't bother mounting our local source code as nodemon is not running to enable reloading.

```
# Start Dev image
$ docker run --name my-dev-container -p 8000:8000 -d -v "$(pwd)"/src:/app/src my-node-app:dev
b67e760ef59c2c42c2737720031537f169302513b37b4b97478c8f21e59791bb

# Start Prod image
$ docker run --name my-prod-container -p 9000:8000 -d my-node-app:prod
200d00aafb79ed371428c9f647e5f7ef2ad9d2ddd3281587401a6fc6267c0101

# Test Dev container
$ curl localhost:8000
Hello Bitovi!

# Test Prod container
$ curl localhost:9000
Hello Bitovi!

# Kill our containers
docker rm -f my-dev-container my-prod-container
```

### A word of caution

Using multi-stage builds to customize container behavior can create issues where an image works locally, but doesn't work in production. Be sure to test your production image during your CI pipeline or before committing to source control.

### Review

Our Dockerfile has been updated to be significantly smaller from a smaller base image and eliminating unnecessary dependencies. We also use multi-stage builds to allow local development to still be done efficiently.

With all this complexity, there are a lot of cli commands and flags to remember. In the last section, we will be looking at using docker-compose to simplify the building and running of images.

## Docker Compose

### Overview

At this point, we are building our image with

```
$ MY_ENV=dev
$ docker build -t my-node-app:$MY_ENV --target $MY_ENV .
```

and running it with

```
$ MY_PORT=9000
$ docker run \
--name my-container \
-p 8000:$MY_PORT \
-e PORT=$MY_PORT \
-v "$(pwd)"/src:/app/src \
my-node-app:dev
```

That's a lot of typing and memorization to run a container. Docker compose condenses all of this into one command: docker-compose up.

### Docker Compose

Docker Compose is a cli included with Docker that provides a declarative way to building and running multiple Docker containers. With Docker Compose, the nomenclature for one of these containers is called a "service".

Docker Compose reads a special file called docker-compose.yml that defines any number of services' port mappings, volumes, interdependencies and more. Docker Compose ensures containers are run in a consistent way without needing to type docker build and docker run along with numerous arguments into the console.

### Replacing docker run

Instead of running

```
$ MY_PORT=9000
$ docker run \
--name my-container \
-p 8000:$MY_PORT \
-e PORT=$MY_PORT \
-v "$(pwd)"/src:/app/src \
my-node-app:dev
```

we can capture all of these arguments in a docker-compose.yml file.

First create a .env file with the following content. docker-compose will automatically read these environment variables and allow us to use them throughout docker-compose.yml.

```
$ MY_PORT=8000
$ MY_ENV=dev
```

Create a docker-compose.yml in the root of your application repo and paste the following content:

```
version: "3.8"
services:
  my-app:
    image: my-node-app:${MY_ENV}
    ports:
      - "9000:${MY_PORT}"
    volumes:
      - ./src:/app/src
    environment:
      PORT: ${MY_PORT}
```

Hopefully, this file is self-explanatory. It creates a service called "my-app" that creates an instance of our my-node-app image with the desired port mapping, volumes and environment variables defined.

Run docker-compose up and watch the magic.

```
$ docker-compose up
Starting nodeapp_my-app_1 ... done
Attaching to nodeapp_my-app_1
my-app_1  |
my-app_1  | > bitovi-academy-app@1.0.0 start
my-app_1  | > nodemon src/index.js
my-app_1  |
my-app_1  | [nodemon] 2.0.6
my-app_1  | [nodemon] to restart at any time, enter `rs`
my-app_1  | [nodemon] watching path(s): *.*
my-app_1  | [nodemon] watching extensions: js,mjs,json
my-app_1  | [nodemon] starting `node src/index.js`
my-app_1  | Example app listening at http://localhost:8000
```

You can press ctrl+c or run docker-compose down from a separate tab to kill your container(s).

### Replacing docker build

Now that we've replaced docker run with docker-compose up, Let's update docker-compose.yml to allow Docker Compose to manage builds too.

```
version: "3.8"
services:
my-app:
build:
context: .
target: ${MY_ENV}
    image: my-node-app:${MY_ENV}
ports: - "9000:${MY_PORT}"
volumes: - ./src:/app/src
environment:
PORT: ${MY_PORT}
```

We've added a build section to our my-app service.

- context: . tells Docker Compose where to find the Dockerfile
- target: ${MY_ENV} tells Docker to build either a dev or prod image Run docker-compose build to build a fresh copy of my-node-app.

### Customizing Behaviour

Now we can control how our image is built and run from .env.

Changing MY_ENV=dev to MY_ENV=prod will cause docker-compose up to create a container in the production mode. If an image does not exist, docker-compose up will automatically run docker-compose build for us!

Let's add more containers!
Let's add a MySQL database and ensure it is running before starting the my-app service.

.env

```
# My App

MY_ENV=prod
MY_PORT=8000

# MySQL

MYSQL_ROOT_PASSWORD=S3cure!
MYSQL_DATABASE=my_db
MYSQL_USER=my_user
MYSQL_PASSWORD=S3cure!\_user
```

docker-compose.yml

```
version: "3.8"
services:
my-app:
build:
context: .
target: ${MY_ENV}
    image: my-node-app:${MY_ENV}
ports: - "9000:${MY_PORT}"
volumes: - ./src:/app/src
environment:
PORT: ${MY_PORT}
depends_on: - db
db:
image: mysql:5.7
volumes: - db_data:/var/lib/mysql
restart: always
environment:
MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE: ${MYSQL_DATABASE}
MYSQL_USER: ${MYSQL_USER}
MYSQL_PASSWORD: ${MYSQL_PASSWORD}
volumes:
db_data: {}
```

Finally, let's start everything up

```
$ docker-compose up
Creating network "nodeapp_default" with the default driver
Creating nodeapp_db_1 ... done
Creating nodeapp_my-app_1 ... done
Attaching to nodeapp_db_1, nodeapp_my-app_1
...
my-app_1 |
my-app_1 | > bitovi-academy-app@1.0.0 start:prod
my-app_1 | > node src/index.js
my-app_1 |
db_1 | 2020-11-24T20:43:30.390198Z 0 [Note] Event Scheduler: Loaded 0 events
db_1 | 2020-11-24T20:43:30.390526Z 0 [Note] mysqld: ready for connections.
db_1 | Version: '5.7.32' socket: '/var/run/mysqld/mysqld.sock' port: 3306 MySQL Community Server (GPL)
my-app_1 | Example app listening at http://localhost:8000
```

### Review

This course has taken you through Docker fundamentals and has only scratched the surface of container orchestration. Docker Compose has a large list of commands (docker-compose --help) and an extensive compose file reference for all your container needs. It could be an entire course in itself.

I hope this course has whet your appetite on containers and orchestration. What do you want to see next? Kubernetes? AWS? Load Testing? CI/CD? Let us know!
