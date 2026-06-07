from celery import Celery


celery = Celery(
    "fetcher",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/0",
    include=["main"]
)