from pathlib import Path

from helpers import createDriver
from helpers import delete_account
from helpers import printNotice
from helpers import printSuccess
from helpers import signup

FRONTEND_URL = "http://localhost:5173"

TEST_EMAIL = "rat8@njit.edu"
TEST_PASSWORD = "password"


def test_signup(driver=None, keep_driver=False):
    """Test signup here"""

    # ---------- Create driver for standalone tests ----------
    is_standalone_test = False

    if driver is None:
        driver = createDriver()
        is_standalone_test = True

    # ---------------------- Test code -----------------------
    printNotice(f"Running {Path(__file__).name}")
    try:
        signup(driver)
        printSuccess(f"No errors in {Path(__file__).name}: {driver.current_url} \n")
        return driver

    # ----------- Quit driver for standalone tests -----------
    finally:
        if is_standalone_test and not keep_driver:
            delete_account(driver)
            driver.quit()
            print("Browser closed \n")


if __name__ == "__main__":
    test_signup()
