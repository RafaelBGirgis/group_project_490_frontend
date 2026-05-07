from helpers import createDriver
from helpers import printFailure
from helpers import printSuccess
from helpers import signup


SPECIAL_ACCOUNTS = [
    {
        "email": "rat8@njit.edu",
        "name": "Ricardo Tobar Vergara",
        "signup_gender": "Male",
        "onboarding_gender": "male",
        "age": "21",
    },
    {
        "email": "wiifittrainer@gmail.com",
        "name": "Wii Fit Trainer",
        "signup_gender": "Female",
        "onboarding_gender": "female",
        "age": "27",
    },
    {
        "email": "johndoe@gmail.com",
        "name": "John Doe",
        "signup_gender": "Male",
        "onboarding_gender": "male",
        "age": "24",
    },
    {
        "email": "janedoe@gmail.com",
        "name": "Jane Doe",
        "signup_gender": "Female",
        "onboarding_gender": "female",
        "age": "23",
    },
]

COMMON_PASSWORD = "password"


def create_special_accounts():
    """Create the one-off hardcoded accounts used for training sessions."""

    for account in SPECIAL_ACCOUNTS:
        driver = createDriver()

        try:
            print(f"Creating account for {account['name']}...")
            signup(
                driver,
                name=account["name"],
                email=account["email"],
                age=account["age"],
                signup_gender=account["signup_gender"],
                onboarding_gender=account["onboarding_gender"],
                password=COMMON_PASSWORD,
            )
            printSuccess(f"Created {account['email']}")
        except Exception as e:
            printFailure(f"Failed to create {account['email']}: {e}")
            raise
        finally:
            driver.quit()
            print("Browser closed\n")


if __name__ == "__main__":
    create_special_accounts()
