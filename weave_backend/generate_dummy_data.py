import os
import random
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient
from faker import Faker
import google.generativeai as genai

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    print("Error: MONGO_URI not found in .env file.")
    exit(1)

print("Connecting to MongoDB...")
client = MongoClient(MONGO_URI)
db = client.get_database("test")

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# Ensure we use a model that supports JSON response if possible, or we will just parse it
model = genai.GenerativeModel('gemini-2.5-flash')

# Initialize Faker
fake = Faker('en_IN')  # Use Indian locale for realistic names and addresses

# Helper to generate random coordinates roughly in India
def get_random_location():
    # Bounding box for India roughly
    lat = random.uniform(8.0, 37.0)
    lng = random.uniform(68.0, 97.0)
    city = fake.city()
    return city, lat, lng

# Skills and Interests for Volunteers
SKILLS_LIST = ['First Aid', 'Teaching', 'Public Speaking', 'Logistics', 'Fundraising', 'Event Management', 'Social Media', 'Content Writing', 'Photography', 'Medical', 'Legal', 'Tech']
INTERESTS_LIST = ['Education', 'Health', "Women's Rights", 'Environment', 'Food Security', 'Livelihood', 'Animal Welfare']

# 1. Generate Volunteers (Users)
def generate_volunteers(count=50):
    print(f"Generating {count} volunteers...")
    volunteers = []
    for _ in range(count):
        city, lat, lng = get_random_location()
        volunteer = {
            "email": fake.unique.email(),
            "password": "hashed_password_placeholder", # We don't need real passwords for dummy data since they might just be displayed
            "name": fake.name(),
            "dob": fake.date_of_birth(minimum_age=18, maximum_age=65).strftime('%Y-%m-%d'),
            "phone": fake.phone_number(),
            "location": city,
            "lat": lat,
            "lng": lng,
            "isVolunteer": True,
            "profilePic": f"https://i.pravatar.cc/150?u={fake.uuid4()}",
            "address": fake.address().replace('\n', ', '),
            "aadhaar": f"{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}",
            "skills": random.sample(SKILLS_LIST, k=random.randint(1, 4)),
            "interests": random.sample(INTERESTS_LIST, k=random.randint(1, 3))
        }
        volunteers.append(volunteer)
    
    if volunteers:
        db.users.insert_many(volunteers)
        print(f"Inserted {count} volunteers.")
    return volunteers

# 2. Generate NGOs
def generate_ngos(count=20):
    print(f"Generating {count} NGOs...")
    ngos = []
    for _ in range(count):
        city, lat, lng = get_random_location()
        ngo = {
            "name": f"{fake.company()} Foundation",
            "description": fake.catch_phrase(),
            "purpose": random.choice(INTERESTS_LIST),
            "location": city,
            "lat": lat,
            "lng": lng,
            "contact": fake.phone_number(),
            "email": fake.company_email(),
            "website": fake.domain_name(),
            "createdAt": datetime.now()
        }
        ngos.append(ngo)
    
    if ngos:
        db.ngos.insert_many(ngos)
        print(f"Inserted {count} NGOs.")
    return ngos

def generate_tasks(count=30):
    print(f"Generating {count} tasks/drives...")
    tasks = []
    types = ['Cleanup', 'Teaching', 'Medical Camp', 'Tree Plantation', 'Food Distribution', 'Awareness Campaign']
    
    task_contexts = []
    for _ in range(count):
        city, lat, lng = get_random_location()
        task_type = random.choice(types)
        title = f"{city} {task_type} Drive"
        task_contexts.append({"city": city, "lat": lat, "lng": lng, "type": task_type, "title": title})

    print("Fetching task descriptions and skills from Gemini...")
    prompt = f"Generate realistic descriptions and required skills for {count} volunteer tasks. Return ONLY a JSON array of exactly {count} objects. Each object must have exactly these keys: 'description' (string, 2-3 sentences), 'requiredSkills' (array of 1-3 strings).\n\n"
    for i, ctx in enumerate(task_contexts):
        prompt += f"{i+1}. Title: {ctx['title']} | Type: {ctx['type']}\n"
        
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        gemini_results = json.loads(response.text)
    except Exception as e:
        print(f"Gemini batch failed for tasks: {e}")
        gemini_results = []
    
    for i in range(count):
        ctx = task_contexts[i]
        gemini_data = gemini_results[i] if i < len(gemini_results) and isinstance(gemini_results[i], dict) else {}
        
        scheduled_date = datetime.now() + timedelta(days=random.randint(1, 30))
        
        task = {
            "title": ctx["title"],
            "type": ctx["type"],
            "description": gemini_data.get("description", fake.paragraph(nb_sentences=3)),
            "location": ctx["city"],
            "lat": ctx["lat"],
            "lng": ctx["lng"],
            "urgency": random.randint(1, 10),
            "requiredSkills": gemini_data.get("requiredSkills", random.sample(SKILLS_LIST, k=random.randint(1, 3))),
            "scheduledDate": scheduled_date,
            "scheduledTime": f"{random.randint(8, 18):02d}:00",
            "volunteersNeeded": random.randint(5, 50),
            "assignedVolunteers": [],
            "rejectedBy": [],
            "status": random.choice(['Pending', 'Assigned', 'Completed']),
            "createdAt": datetime.now()
        }
        tasks.append(task)
    
    if tasks:
        db.tasks.insert_many(tasks)
        print(f"Inserted {count} tasks.")
    return tasks

# 4. Generate Reports (Problems)
def generate_reports(count=20):
    print(f"Generating {count} reports/problems...")
    reports = []
    titles = ['Water Leakage', 'Broken Road', 'Stray Animals', 'Garbage Dump', 'Power Outage', 'Medical Emergency']
    
    report_contexts = []
    for _ in range(count):
        city, lat, lng = get_random_location()
        title = f"{random.choice(titles)} in {city}"
        report_contexts.append({"city": city, "lat": lat, "lng": lng, "title": title})
        
    print("Fetching report descriptions and skills from Gemini...")
    prompt = f"Generate realistic descriptions and the required skill for {count} civilian reports/problems. Return ONLY a JSON array of exactly {count} objects. Each object must have exactly these keys: 'description' (string, 1-2 sentences), 'requiredSkill' (string, a single most relevant skill).\n\n"
    for i, ctx in enumerate(report_contexts):
        prompt += f"{i+1}. Title: {ctx['title']}\n"
        
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        gemini_results = json.loads(response.text)
    except Exception as e:
        print(f"Gemini batch failed for reports: {e}")
        gemini_results = []
        
    for i in range(count):
        ctx = report_contexts[i]
        gemini_data = gemini_results[i] if i < len(gemini_results) and isinstance(gemini_results[i], dict) else {}
        
        report = {
            "title": ctx["title"],
            "description": gemini_data.get("description", fake.paragraph(nb_sentences=2)),
            "location": ctx["city"],
            "lat": ctx["lat"],
            "lng": ctx["lng"],
            "imageUrl": f"https://picsum.photos/seed/{fake.uuid4()}/400/300",
            "reportedBy": fake.email(),
            "requiredSkill": gemini_data.get("requiredSkill", random.choice(SKILLS_LIST)),
            "status": random.choice(['Pending', 'Verified Pending']),
            "createdAt": datetime.now() - timedelta(days=random.randint(0, 5))
        }
        reports.append(report)
    
    if reports:
        db.problems.insert_many(reports)
        print(f"Inserted {count} reports.")
    return reports

if __name__ == "__main__":
    print("Starting data generation...")
    # Generate data
    generate_volunteers(50)
    generate_ngos(20)
    generate_tasks(30)
    generate_reports(20)
    print("Data generation completed successfully.")
