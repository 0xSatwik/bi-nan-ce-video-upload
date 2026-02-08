import subprocess
import os
import sys

def run_step(command, step_name):
    print(f"\n{'='*50}")
    print(f"Running Step: {step_name}")
    print(f"Command: {command}")
    print(f"{'='*50}\n")
    
    try:
        # split command into list if it's a string, but for shell=True on windows it's often easier to keep string
        result = subprocess.run(command, shell=True, check=True)
        print(f"✅ Step '{step_name}' completed successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Step '{step_name}' failed with error code {e.returncode}.")
        return False

def main():
    # Step 1: Generate Audio (if needed)
    # We run this every time to ensure consistency, or we could check if files exist.
    # Given the fast generation, running it is safer.
    if not run_step("python scripts/generate_audio.py", "Generate Audio"):
        return

    # Step 2: Record Video
    # We use npx playwright test
    if not run_step("npx playwright test scripts/record.spec.ts", "Record Video"):
        return

    # Step 3: Process Video
    # This combines audio and video
    if not run_step("python scripts/process_video.py", "Process Video"):
        return

    # Step 4: Upload Video (or just save backup)
    # This script handles authentication failure gracefully
    if not run_step("python scripts/upload.py", "Upload / Save Video"):
        return

    print("\n🎉 Full Video Generation Pipeline Completed Successfully!")

if __name__ == "__main__":
    main()
