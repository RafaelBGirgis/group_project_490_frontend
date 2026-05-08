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

from helpers import createDriver, printSuccess
from helpers import login
from helpers import scroll 

def test_client_dashboard():
    """Navigate from login page to client dashboard"""

    driver = createDriver()
    login(driver)

    time.sleep(2)

    # Scroll down slowly
    print("Scrolling down slowly...")
    scroll(driver, "down", 0.01, 10)

    # Scroll back up
    print("Scrolling up...")
    scroll(driver, "up", 0.01, 10)

    printSuccess(f"Successfully logged in: {driver.current_url}")

    driver.quit()
    print("Browser closed \n")

if __name__ == "__main__":
    test_client_dashboard()