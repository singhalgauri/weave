const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
    console.log("Connected to MongoDB.");

    const userSchema = new mongoose.Schema({
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        name: { type: String, required: true },
        dob: { type: String, required: true },
        phone: { type: String, required: true },
        location: { type: String, required: true },
        lat: { type: Number },
        lng: { type: Number },
        isVolunteer: { type: Boolean, default: false },
        profilePic: { type: String, default: '' },
        address: { type: String, default: '' },
        aadhaar: { type: String, default: '' },
        skills: [{ type: String }],
        interests: [{ type: String }]
    });

    const User = mongoose.model('User', userSchema);

    const VOLUNTEER_DEFAULTS = [
        {
            email: 'priya.sharma@example.com',
            name: 'Priya Sharma',
            dob: '1995-08-15',
            phone: '+91-9876543210',
            location: 'New Delhi',
            lat: 28.6139,
            lng: 77.2090,
            isVolunteer: true,
            profilePic: 'https://i.pravatar.cc/150?img=1',
            address: '12, Lodhi Road, New Delhi, 110003',
            aadhaar: 'XXXX-XXXX-1234',
            skills: ['First Aid', 'Teaching', 'Public Speaking'],
            interests: ['Education', 'Health', "Women's Rights"]
        },
        {
            email: 'rahul.verma@example.com',
            name: 'Rahul Verma',
            dob: '1992-04-20',
            phone: '+91-8765432109',
            location: 'Mumbai',
            lat: 19.0760,
            lng: 72.8777,
            isVolunteer: true,
            profilePic: 'https://i.pravatar.cc/150?img=11',
            address: '45, Andheri West, Mumbai, 400053',
            aadhaar: 'XXXX-XXXX-5678',
            skills: ['Logistics', 'Fundraising', 'Event Management'],
            interests: ['Environment', 'Food Security']
        },
        {
            email: 'ananya.desai@example.com',
            name: 'Ananya Desai',
            dob: '1998-11-05',
            phone: '+91-7654321098',
            location: 'Bengaluru',
            lat: 12.9716,
            lng: 77.5946,
            isVolunteer: true,
            profilePic: 'https://i.pravatar.cc/150?img=5',
            address: '78, Koramangala, Bengaluru, 560034',
            aadhaar: 'XXXX-XXXX-9012',
            skills: ['Social Media', 'Content Writing', 'Photography'],
            interests: ['Education', 'Environment', 'Livelihood']
        }
    ];

    try {
        const hashedPassword = await bcrypt.hash('volunteer123', 10);
        
        for (const v of VOLUNTEER_DEFAULTS) {
            const exists = await User.findOne({ email: v.email });
            if (!exists) {
                const user = new User({ ...v, password: hashedPassword });
                await user.save();
                console.log("Seeded:", v.name);
            } else {
                console.log("Already exists:", v.name);
            }
        }
    } catch (err) {
        console.error(err);
    }
    
    mongoose.disconnect();
});
