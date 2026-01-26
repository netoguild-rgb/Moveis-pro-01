import paramiko
import os
import zipfile
import sys
import time

# Config
HOSTNAME = '145.223.31.180'
USERNAME = 'root'
PASSWORD = '238554A@a238554A@a' # Hardcoded as requested/verified in check_vps.py
REMOTE_DIR = '/root/moveis-pro'
LOCAL_DIR = os.getcwd()
ZIP_FILENAME = 'project_deploy.zip'

# Folders/Files to exclude from the upload
EXCLUDES = {
    'node_modules', '.git', '.vscode', '.gemini', 'dist', 'build', 
    'project_deploy.zip', '__pycache__', '.DS_Store', '.agent' 
}

def zip_project(output_filename):
    print(f"COMPRESS: Zipping project to {output_filename}...")
    count = 0
    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(LOCAL_DIR):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDES]
            
            for file in files:
                if file not in EXCLUDES and not file.endswith('.zip'):
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, LOCAL_DIR)
                    zipf.write(file_path, arcname)
                    count += 1
    print(f"COMPRESS: Zip created with {count} files.")

def deploy():
    ssh = None
    try:
        # 1. Zip
        zip_project(ZIP_FILENAME)
        
        # 2. Connect
        print(f"CONNECT: Connecting to {HOSTNAME}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOSTNAME, username=USERNAME, password=PASSWORD)
        print("CONNECT: Connected successfully.")

        # 3. Upload
        print(f"UPLOAD: Sending {ZIP_FILENAME} to {REMOTE_DIR}...")
        sftp = ssh.open_sftp()
        try:
            sftp.stat(REMOTE_DIR)
        except IOError:
            print(f"UPLOAD: Creating remote directory {REMOTE_DIR}")
            ssh.exec_command(f"mkdir -p {REMOTE_DIR}")
        
        sftp.put(ZIP_FILENAME, f"{REMOTE_DIR}/{ZIP_FILENAME}")
        sftp.close()
        print("UPLOAD: Upload complete.")

        # 4. Unzip and Setup
        print("REMOTE: Unzipping...")
        # Clean existing files (optional but good for clean deploy) and unzip
        # apt-get install unzip if missing might be needed, but we assume basic env or vps_setup handles it. 
        # Actually unzip might not be installed. Let's try to install it first just in case.
        stdin, stdout, stderr = ssh.exec_command("apt-get update && apt-get install -y unzip")
        stdout.channel.recv_exit_status() # Wait for install

        cmd = f"cd {REMOTE_DIR} && unzip -o {ZIP_FILENAME} && rm {ZIP_FILENAME}"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status == 0:
            print("REMOTE: Unzip successful.")
        else:
            print(f"REMOTE ERROR: {stderr.read().decode()}")

        # 5. Make scripts executable
        print("REMOTE: Setting permissions...")
        ssh.exec_command(f"chmod +x {REMOTE_DIR}/vps_setup.sh")
        
        print("\nSUCCESS: Deployment files transferred!")
        
    except Exception as e:
        print(f"FAILURE: Deployment failed: {e}")
    finally:
        if ssh: ssh.close()
        if os.path.exists(ZIP_FILENAME):
            os.remove(ZIP_FILENAME)
            print("CLEANUP: Removed local zip file.")

if __name__ == "__main__":
    deploy()
