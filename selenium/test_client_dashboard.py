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


FRONTEND_URL = "http://localhost:5173"

TEST_EMAIL = "rat8@njit.edu"
TEST_PASSWORD = "password"   

def test_client_dashboard():
    """Navigate from login page to client dashboard"""

    driver = createDriver()

    login(driver)
    printSuccess(f"Successfully logged in: {driver.current_url}")

    driver.quit()
    print("Browser closed \n")

if __name__ == "__main__":
    test_client_dashboard()