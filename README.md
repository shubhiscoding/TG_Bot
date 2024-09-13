# TG_Bot
Running The Bot:

create a .env file with the following details:
```
MY_TOKEN=TELEGRAM_BOT_TOKEN
MY_CHAT_ID=SERVER_CHAT_ID
MY_TASK_CREATED_SQS=PAID_TASK_SQS_PATH_URL
MY_TASK_PAID_SQS=PAID_EVENT_SQS_PATH_URL
AWS_ACCESS_KEY_ID=ACCESS_KEY
AWS_SECRET_ACCESS_KEY=SECRET_KEY
AWS_REGION=REGION
AWS_ENDPOINT=ENDPOINT
TASK_CREATED_VIDEO_URL=Video_Url
TASK_PAID_VIDEO_URL=Video_Url
TASK_BASE_URL=BASE_URL
```
Build The docker Image
```
docker build -t telegram-bot:latest .
```

Run the docker Image:
```
docker compose up
```

NOTE: The project is meant to be used with localStack and hence the docker-compose.yml is configured with details of localStack.