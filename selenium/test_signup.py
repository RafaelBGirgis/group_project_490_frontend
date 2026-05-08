import time

from helpers import createDriver
from helpers import printSuccess
from helpers import signup

FRONTEND_URL = "http://localhost:5173"

TEST_EMAIL = "rat8@njit.edu"
TEST_PASSWORD = "password"   

def test_signup():
    """Test signup here"""

    driver = createDriver()
    signup(driver)

    printSuccess(f"Sign-Up works: {driver.current_url}")

    driver.quit()
    print("Browser closed \n")

if __name__ == "__main__":
    test_signup()