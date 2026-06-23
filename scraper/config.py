"""Keyword sets, comp floors, location maps — mirrors src/lib/jobScore.ts constants."""

BFSI_KEYWORDS = [
    "bank", "banking", "financial services", "fintech", "insurance", "payments",
    "capital markets", "credit", "lending", "wealth", "asset management",
    "securities", "trading", "broking",
]

GOVERNANCE_KW = [
    "program governance", "raid", "steering committee", "p&l", "budget", "pmo",
    "transformation", "portfolio", "roadmap", "stakeholder management",
    "delivery governance",
]

SENIOR_PM_KW = [
    "senior program", "sr program", "technical program", "delivery program",
    "tpm", "program governance",
]

NEGATIVE_KW = [
    "intern", "internship", "fresher", "trainee", "graduate program",
    "entry level", "junior",
]

TIER1_BFSI = [
    "barclays", "jpmorgan", "jp morgan", "citi", "citibank", "deutsche",
    "morgan stanley", "goldman", "amex", "american express", "mastercard",
    "visa", "ubs", "hsbc", "standard chartered", "nomura", "blackrock",
    "fidelity", "wells fargo", "bank of america", "bnp paribas",
]

GCC_FINTECH = [
    "nasdaq", "fiserv", "fis", "broadridge", "paypal", "razorpay", "phonepe",
    "cred", "groww", "zerodha", "navi", "paytm", "stripe", "revolut", "wise",
]

IT_SERVICES = [
    "accenture", "capgemini", "infosys", "tcs", "wipro", "cognizant", "hcl",
    "ltimindtree", "mphasis", "persistent", "deloitte", "ey", "pwc", "kpmg",
    "edgeverve", "finacle", "infosys bpm", "coforge", "birlasoft", "zensar",
    "hexaware", "nagarro", "mindtree", "tech mahindra", "virtusa",
]

GOOD_LOCS_PRIMARY = ["mumbai", "navi mumbai", "thane", "pune"]
RELOCATABLE_METROS = ["bengaluru", "bangalore", "hyderabad", "gurgaon", "gurugram", "noida"]

FOREIGN_LOCS = [
    "united arab emirates", "uae", "dubai", "abu dhabi", "sharjah",
    "saudi arabia", "saudi", "riyadh", "jeddah",
    "qatar", "doha", "kuwait", "bahrain", "manama", "oman", "muscat",
    "singapore", "malaysia", "kuala lumpur",
    "united kingdom", "london", "united states", "germany",
    "netherlands", "amsterdam", "canada", "toronto", "australia", "sydney",
]

FRESH_MAX = 3
AGING_MAX = 7
COMP_FLOOR = 4_000_000
