from pathlib import Path

from helpers import createDriver
from helpers import scroll
from helpers import delete_account
from helpers import printNotice
from helpers import printSuccess
from helpers import printFailure
from helpers import printCongratulation

from test_landing_page import test_landing_page
from test_daily_check_in import test_daily_check_in
from test_signup import test_signup


def test_client_dashboard(driver=None):
    """Navigate from login page to client dashboard"""

    # ---------- Create driver for standalone tests ----------
    is_standalone_test = False

    if driver is None:
        driver = createDriver()
        is_standalone_test = True

    # ---------------------- Test code -----------------------
    try:
        # Add pre-signup tests here
        test_landing_page(driver)
        test_signup(driver)

        # Scroll through website
        printNotice(f"Running {Path(__file__).name}")
        printSuccess(f"Currently in: {driver.current_url}")
        print("Scrolling through website...")
        scroll(driver, "down", 0.01, 10)
        scroll(driver, "up", 0.01, 10)
        print("Testing dashboard features... \n")

        # Add post-signup tests here
        test_daily_check_in(driver)

        printCongratulation(f"All tests passed!: {driver.current_url} \n")

    except Exception as e:
        printFailure(f"There was an error: {e} \n")
        printFailure("Execution is paused so you can inspect the browser.")
        printFailure("Close the browser manually, then press Enter to end the script.\n")
        if driver is not None:
            input()
        raise

    # ----------- Quit driver for standalone tests -----------
    finally:
        if is_standalone_test:
            delete_account(driver)
            driver.quit()
            print("Browser closed \n")


def test_daily_workout(driver):
    pass
    # Hover over Today's Workout
    # Click on Plan My Week, redirects to '/plan-my-week'
    # Click on 'Browse Plans'
    # Complete this later.


if __name__ == "__main__":
    test_client_dashboard()
