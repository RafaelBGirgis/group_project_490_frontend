import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.edge.options import Options

from helpers import createDriver, printSuccess
from helpers import signup
from helpers import scroll


FRONTEND_URL = "http://localhost:5173"

TEST_EMAIL = "rat8@njit.edu"
TEST_PASSWORD = "password"   

def test_myscript():
    """Navigate from login page to client dashboard"""

    driver = createDriver()
    signup(driver)

    time.sleep(2)

    printSuccess(f"No errors: {driver.current_url}")

    driver.quit()
    print("Browser closed \n")

if __name__ == "__main__":
    test_myscript()