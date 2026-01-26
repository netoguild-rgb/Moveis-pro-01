import paramiko
import sys

hostname = '145.223.31.180'
username = 'root'
password = '238554A@a238554A@a'

def run_cmd(ssh, cmd, title):
    print(f"\n--- {title} ---")
    print(f"CMD: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: 
        try:
            print(out)
        except UnicodeEncodeError:
            print(out.encode('utf-8', errors='replace').decode('utf-8'))
    if err: print(f"STDERR: {err}")

try:
    print(f"Connecting to {hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password)
    print("Connected successfully.")

    run_cmd(client, "uptime", "System Uptime")
    run_cmd(client, "docker ps -a", "Docker Containers")
    run_cmd(client, "ss -tuln", "Listening Ports")
    run_cmd(client, "ls -F /root/moveis-pro", "Project Directory (/root/moveis-pro)")
    # Check if supabase is healthy (if docker ps shows it)
    
except Exception as e:
    print(f"Connection Failed: {e}")
finally:
    if 'client' in locals():
        client.close()
