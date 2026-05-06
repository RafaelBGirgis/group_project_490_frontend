"""
Simple Selenium script to navigate from landing page to login page.
Browser: Microsoft Edge
Frontend: http://localhost:5173
"""

import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.edge.options import Options

from helpers import printSuccess, wait_for_page_to_fully_load
from helpers import scroll

FRONTEND_URL = "http://localhost:5173"

def test_landing_page():
    """Navigate from landing page to login page"""

    edge_options = Options()
    edge_options.add_experimental_option("excludeSwitches", ["enable-logging"])
    edge_options.add_argument("--log-level=3")

    driver = webdriver.Edge(options=edge_options)

    try:
        wait = WebDriverWait(driver, 10)

        # Navigate to landing page
        print("Opening landing page...")
        driver.get(FRONTEND_URL)

        # Wait for page to load - every element in the page needs to load
        print("Waiting for landing page to fully load...")
        wait_for_page_to_fully_load(driver)
        wait.until(EC.presence_of_element_located((By.LINK_TEXT, "Log in")))
        print("Landing page loaded successfully")

        # Scroll down slowly
        print("Scrolling down slowly...")
        scroll(driver, "down", 0.01, 20)

        # Scroll back up
        print("Scrolling up...")
        scroll(driver, "up", 0.01, 20)

        # Click the signup link in the navbar
        print("Clicking signup link...")
        signup_link = wait.until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Get started"))
        )

        ActionChains(driver).move_to_element(signup_link).perform()
        time.sleep(1)
        previous_url = driver.current_url
        signup_link.click()

        # Wait for signup page to load
        wait.until(lambda d: d.current_url != previous_url)
        wait_for_page_to_fully_load(driver)
        print("Navigated to signup page")

        # Verify we're on the signup page
        current_url = driver.current_url
        assert "/signup" in current_url, (
            f"Expected URL to contain '/signup', got: {current_url}"
        )
        printSuccess(f"Successfully navigated to signup page: {driver.current_url}")

    except Exception as e:
        print(f"[x] Test failed: {e} \n")
        raise
    finally:
        driver.quit()
        print("Browser closed \n")

if __name__ == "__main__":
    test_landing_page()