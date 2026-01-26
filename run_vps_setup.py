import paramiko
import os
import time

# Config
HOSTNAME = '145.223.31.180'
USERNAME = 'root'
PASSWORD = '238554A@a238554A@a'
REMOTE_DIR = '/root/moveis-pro'
LOCAL_SETUP_SCRIPT = 'vps_setup.sh'

def run_remote_setup():
    ssh = None
    try:
        print(f"CONNECT: Connecting to {HOSTNAME}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOSTNAME, username=USERNAME, password=PASSWORD)
        print("CONNECT: Connected.")

        # Upload modified vps_setup.sh
        print(f"UPDATE: Updating {LOCAL_SETUP_SCRIPT} on remote...")
        sftp = ssh.open_sftp()
        sftp.put(LOCAL_SETUP_SCRIPT, f"{REMOTE_DIR}/{LOCAL_SETUP_SCRIPT}")
        sftp.close()
        
        # Make executable
        ssh.exec_command(f"chmod +x {REMOTE_DIR}/{LOCAL_SETUP_SCRIPT}")

        # Run Setup
        print("EXECUTE: Running vps_setup.sh... (This may take 5-10 minutes)")
        print("         Detailed logs will be streamed if possible, strictly waiting for exit.")
        
        # Using invoke_shell or executing command with pty to simulate terminal if needed, 
        # but exec_command is simpler for capturing output.
        # We redirect stdout/stderr to ensure we catch everything.
        
        cmd = f"cd {REMOTE_DIR} && ./{LOCAL_SETUP_SCRIPT}"
        stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
        
        # Stream output
        for line in iter(stdout.readline, ""):
            print(line, end="")
            
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status == 0:
            print("\nSUCCESS: VPS Setup Completed!")
        else:
            print(f"\nFAILURE: VPS Setup failed with exit code {exit_status}")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        if ssh: ssh.close()

if __name__ == "__main__":
    run_remote_setup()
