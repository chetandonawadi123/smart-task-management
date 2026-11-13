
from sqlalchemy import text

from app.db.session import engine


def test_connection():

    try:
        with engine.connect() as connection:

            result = connection.execute(
                text("SELECT current_database()")
            )

            database_name = result.scalar_one()

            print("Database connected successfully!")
            print("Database:", database_name)

    except Exception as error:
        print("Database connection failed!")
        print(error)

    finally:
        engine.dispose()


if __name__ == "__main__":
    test_connection()
