## Description

[NestJS](https://docs.nestjs.com) based identity verification API using [ComplyCube](https://complycube.com/)

## Preparation

Run the following command to copy the appropriate environment variables into the correct file

```bash
cp .env.example .env
```

This repo uses git submodule [complycube-shared](https://github.com/izhyvaiev/complycube-shared)
The module provides shared typings and validation for front and back end  
After cloning this repo please fetch submodule sources with following command:

```bash
git submodule update --init --recursive
```

To run this app you can either run a docker container or run locally

To run it locally you'll need to have Node v22 and PostgreSQL sever installed.
In this case - please create database with name matching your .env

To start code run

```bash
npm install
npm run start
```

Alternatively you can setup everything in Docker container, to do so simply run

```bash
docker-compose up --build
```

For local webhooks processing you'll need to setup [ngrok](https://ngrok.com) and put your ngrok domain to .env
To start ngrok:

```bash
sudo ngrok http --domain=your-domain.ngrok-free.app 3001
```

To run tests simply run 

```bash
npm run test
```