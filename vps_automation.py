import paramiko
import sys
import os

hostname = '145.223.31.180'
username = 'root'
password = '238554A@a238554A@a'

def run_cmd(ssh, cmd):
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f"STDERR: {err}")
    
    if exit_status != 0:
        print(f"Command failed with status {exit_status}")
        return False
    return True

try:
    print(f"Connecting to {hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password)
    print("Connected successfully.")

    changes_made = False

    # Check for deploy.zip
    print("\n[1/3] Checking for deploy.zip...")
    # Check in /root/moveis-pro/ or just /root/
    # User was instructed to upload to /root/moveis-pro/
    path = "/root/moveis-pro/deploy.zip"
    check = run_cmd(client, f"ls -lh {path}")
    if not check:
        # Try /root/deploy.zip just in case
        print("Checking /root/deploy.zip...")
        path = "/root/deploy.zip"
        check = run_cmd(client, f"ls -lh {path}")
        if not check:
            print("ERROR: deploy.zip not found in /root/moveis-pro/ or /root/")
            sys.exit(1)
        else:
            # Move to correct folder
            run_cmd(client, "mkdir -p /root/moveis-pro")
            run_cmd(client, f"mv {path} /root/moveis-pro/deploy.zip")
            path = "/root/moveis-pro/deploy.zip"

    # Install unzip
    print("\n[2/3] Installing unzip...")
    run_cmd(client, "apt-get update -qq && apt-get install -y unzip -qq")

    # Unzip
    print("\n[3/3] Unzipping project...")
    run_cmd(client, f"unzip -o {path} -d /root/moveis-pro")
    
    print("\n--- Project file structure ---")
    run_cmd(client, "ls -F /root/moveis-pro | head -n 10")

    # cleanup zip? maybe keep for backup
    # run_cmd(client, f"rm {path}")

except Exception as e:
    print(f"Script Error: {e}")
    sys.exit(1)
finally:
    if 'client' in locals():
        client.close()
