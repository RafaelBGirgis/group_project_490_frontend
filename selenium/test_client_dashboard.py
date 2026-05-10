from pathlib import Path

from helpers import createDriver
from helpers import delete_account
from helpers import printCongratulation
from helpers import printFailure
from helpers import printNotice
from helpers import printSuccess
from helpers import scroll

from test_client_find_coach import test_client_find_coach
from test_daily_check_in import test_daily_check_in
from test_landing_page import test_landing_page
from test_signup import test_signup


def test_client_dashboard(driver=None):
    """Navigate from login page to client dashboard"""

    # ---------- Create driver for standalone tests ----------
    is_standalone_test = False

    if driver is None:
        driver = createDriver()
        is_standalone_test = True

    # ---------------------- Test code -----------------------
    failures = []
    tests = [
        test_landing_page,
        test_signup,
        test_daily_check_in,
        test_client_find_coach,
    ]

    try:
        printNotice(f"Running {Path(__file__).name}")

        for test_func in tests:
            try:
                driver = test_func(driver, keep_driver=True)

                if test_func is test_signup and driver is not None:
                    printSuccess(f"Currently in: {driver.current_url}")
                    print("Scrolling through website...")
                    scroll(driver, "down", 0.01, 10)
                    scroll(driver, "up", 0.01, 10)
                    print("Testing dashboard features... \n")

            except Exception as e:
                printFailure(f"{test_func.__name__} failed: {e} \n")
                failures.append((test_func.__name__, str(e)))

                if driver is not None:
                    driver.quit()
                    driver = None
                    printFailure("Shared browser was closed after the failure.\n")

        if failures:
            printFailure("Some dashboard tests failed:\n")
            for test_name, error in failures:
                printFailure(f"- {test_name}: {error}")
        elif driver is not None:
            printCongratulation(f"All tests passed!: {driver.current_url} \n")

    # ----------- Quit driver for standalone tests -----------
    finally:
        if is_standalone_test and driver is not None:
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
