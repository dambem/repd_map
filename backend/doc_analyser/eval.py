from pydantic import BaseModel

class Point(BaseModel):
    easting: int
    northing: int

class Evaluation(BaseModel):
    status: str
    location: Point

