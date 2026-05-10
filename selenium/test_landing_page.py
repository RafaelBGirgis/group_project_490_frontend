"""
Simple Selenium script to navigate from landing page to login page.
Browser: Microsoft Edge
Frontend: http://localhost:5173
"""

import time
from pathlib import Path

from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from helpers import createDriver
from helpers import printNotice
from helpers import printSuccess, wait_for_page_to_fully_load
from helpers import scroll

FRONTEND_URL = "http://localhost:5173"


def test_landing_page(driver=None, keep_driver=False):
    """Navigate from landing page to login page"""

    # ---------- Create driver for standalone tests ----------
    is_standalone_test = False

    if driver is None:
        driver = createDriver()
        is_standalone_test = True

    # ---------------------- Test code -----------------------
    printNotice(f"Running {Path(__file__).name}")
    try:
        wait = WebDriverWait(driver, 10)

        print("Opening landing page...")
        driver.get(FRONTEND_URL)

        print("Waiting for landing page to fully load...")
        wait_for_page_to_fully_load(driver)
        wait.until(EC.presence_of_element_located((By.LINK_TEXT, "Log in")))
        print("Landing page loaded successfully")
        time.sleep(2)

        print("Scrolling down slowly...")
        scroll(driver, "down", 0.01, 15)

        print("Scrolling up...")
        scroll(driver, "up", 0.01, 15)

        print("Clicking signup link...")
        signup_link = wait.until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Get started"))
        )

        ActionChains(driver).move_to_element(signup_link).perform()
        time.sleep(1)
        previous_url = driver.current_url
        signup_link.click()

        wait.until(lambda current_driver: current_driver.current_url != previous_url)
        wait_for_page_to_fully_load(driver)
        print("Navigated to signup page")

        current_url = driver.current_url
        assert "/signup" in current_url, (
            f"Expected URL to contain '/signup', got: {current_url}"
        )
        printSuccess(f"No errors in {Path(__file__).name}: {driver.current_url} \n")
        return driver

    except Exception as e:
        print(f"[x] Test failed: {e} \n")
        raise

    # ----------- Quit driver for standalone tests -----------
    finally:
        if is_standalone_test and not keep_driver:
            driver.quit()
            print("Browser closed \n")


if __name__ == "__main__":
    test_landing_page()
