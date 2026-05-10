import time
from pathlib import Path

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from helpers import createDriver
from helpers import delete_account
from helpers import printNotice
from helpers import printSuccess

from test_signup import test_signup


def test_daily_check_in(driver=None, keep_driver=False):
    """Test the daily check-in workflow: Mood & Wellbeing and Body Metrics"""

    # ---------- Create driver for standalone tests ----------
    is_standalone_test = False

    if driver is None:
        driver = createDriver()
        is_standalone_test = True

    # ---------------------- Test code -----------------------
    printNotice(f"Running {Path(__file__).name}")
    try:
        if is_standalone_test:
            test_signup(driver)

        wait = WebDriverWait(driver, 10)

        print("Looking for Daily Check-in button...")
        check_in_button = wait.until(
            EC.element_to_be_clickable(
                (
                    By.XPATH,
                    "//button[contains(., 'Check-in') or contains(., 'Continue') or contains(., 'Review') or contains(., 'View')]",
                )
            )
        )
        check_in_button.click()
        print("Clicked Daily Check-in button")

        time.sleep(1)

        print("Testing Mood & Wellbeing section...")
        sliders = wait.until(
            lambda current_driver: current_driver.find_elements(
                By.XPATH, "//input[@type='range']"
            )
        )

        if len(sliders) < 3:
            raise AssertionError(f"Expected at least 3 sliders, found {len(sliders)}")

        sliders[0].send_keys("\t")
        driver.execute_script(
            "arguments[0].value = 4; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));",
            sliders[0],
        )
        print("[OK] Set Happiness to 4")
        time.sleep(1)

        driver.execute_script(
            "arguments[0].value = 7; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));",
            sliders[1],
        )
        print("[OK] Set Alertness to 7")
        time.sleep(1)

        driver.execute_script(
            "arguments[0].value = 3; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));",
            sliders[2],
        )
        print("[OK] Set Healthiness to 3")
        time.sleep(1)

        today_goal_textarea = wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//textarea[@placeholder='What do you want to accomplish?']")
            )
        )
        today_goal_textarea.clear()
        today_goal_textarea.send_keys("Testing the Daily Survey.")
        print("[OK] Filled Today's goal")

        gratitude_textarea = wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//textarea[@placeholder='A win, a person, an idea...']")
            )
        )
        gratitude_textarea.clear()
        gratitude_textarea.send_keys("I am grateful")
        print("[OK] Filled gratitude field")
        time.sleep(1)

        mood_submit_button = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(., 'Submit Mood Check-in')]")
            )
        )
        mood_submit_button.click()

        wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//button[.//h3[contains(normalize-space(), 'Mood & Wellbeing')] and .//span[contains(normalize-space(), 'Done') and contains(@class, 'text-green-400')]]",
                )
            )
        )
        print("[OK] Submitted Mood Check-in")
        time.sleep(1)

        print("Testing Body Metrics section...")
        body_metrics_section_button = wait.until(
            EC.element_to_be_clickable(
                (
                    By.XPATH,
                    "//button[.//h3[contains(normalize-space(), 'Body Metrics')]]",
                )
            )
        )
        body_metrics_section_button.click()

        weight_input = wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//input[@type='number' and @placeholder='e.g. 175']")
            )
        )
        weight_input.clear()
        weight_input.send_keys("175")
        print("[OK] Entered weight: 175 lbs")

        body_submit_button = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(., 'Submit Body Metrics')]")
            )
        )
        body_submit_button.click()

        wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//button[.//h3[contains(normalize-space(), 'Body Metrics')] and .//span[contains(normalize-space(), 'Done') and contains(@class, 'text-green-400')]]",
                )
            )
        )
        print("[OK] Submitted Body Metrics")
        time.sleep(1)

        close_daily_check_in_button = wait.until(
            EC.element_to_be_clickable(
                (
                    By.XPATH,
                    "//h2[normalize-space()='Daily Check-in']/following-sibling::button[1]",
                )
            )
        )
        close_daily_check_in_button.click()

        wait.until(
            EC.invisibility_of_element_located(
                (By.XPATH, "//h2[normalize-space()='Daily Check-in']")
            )
        )

        printSuccess(f"No errors in {Path(__file__).name}: {driver.current_url} \n")
        return driver

    # ----------- Quit driver for standalone tests -----------
    finally:
        if is_standalone_test and not keep_driver:
            delete_account(driver)
            driver.quit()
            print("Browser closed \n")


if __name__ == "__main__":
    test_daily_check_in()
