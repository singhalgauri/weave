import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

String? globalUserEmail;
String? globalJwtToken;
Map<String, dynamic>? globalUserData;

void main() {
  runApp(const WeaveApp());
}

class WeaveApp extends StatelessWidget {
  const WeaveApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Weave Background App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const LoginPage(),
    );
  }
}

const List<Map<String, dynamic>> appRegions = [
  {
    "box_2d": [75, 550, 300, 1000],
    "volunteer_name": "Heatmap Region",
    "civilian_name": "Profile",
  },
  {
    "box_2d": [400, 540, 600, 994],
    "volunteer_name": "Conduct a survey",
    "civilian_name": "Heatmap",
  },
  {
    "box_2d": [735, 545, 968, 991],
    "volunteer_name": "Task Region",
    "civilian_name": "Report a problem",
  },
  {
    "box_2d": [538, 22, 750, 442],
    "volunteer_name": "Impact Region",
    "civilian_name": "Be a volunteer",
  },
  {
    "box_2d": [100, 0, 400, 450],
    "volunteer_name": "Profile region",
    "civilian_name": "Available surveys",
  },
];

class BackgroundMapPage extends StatelessWidget {
  const BackgroundMapPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          final height = constraints.maxHeight;

          return Stack(
            children: [
              // Background Image
              Positioned.fill(
                child: Image.asset(
                  'assets/v-background.png',
                  fit: BoxFit.fill,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: Colors.blueGrey[50],
                      child: const Center(
                        child: Text(
                          'Background Image Missing\nPlease place the image at:\nassets/background.png',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 18),
                        ),
                      ),
                    );
                  },
                ),
              ),
              // Clickable Regions
              ...appRegions.map((region) {
                final box = region['box_2d'] as List<int>;
                final name = region['volunteer_name'] as String;
                // Coordinates format: [ymin, xmin, ymax, xmax] scaled by 1000
                final top = (box[0] / 1000.0) * height;
                final left = (box[1] / 1000.0) * width;
                final bottom = (box[2] / 1000.0) * height;
                final right = (box[3] / 1000.0) * width;

                final w = right - left;
                final h = bottom - top;

                return Positioned(
                  top: top,
                  left: left,
                  width: w,
                  height: h,
                  child: GestureDetector(
                    onTap: () {
                      if (name == 'Profile region') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const ProfilePage(),
                          ),
                        );
                      } else {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => DetailsPage(title: name),
                          ),
                        );
                      }
                    },
                    child: Container(color: Colors.transparent),
                  ),
                );
              }),
            ],
          );
        },
      ),
    );
  }
}

class DetailsPage extends StatelessWidget {
  final String title;

  const DetailsPage({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Text(
          'Welcome to the $title!',
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}

class CivilianDashboardPage extends StatelessWidget {
  const CivilianDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          final height = constraints.maxHeight;

          return Stack(
            children: [
              // Background Image
              Positioned.fill(
                child: Image.asset(
                  'assets/c-background.png',
                  fit: BoxFit.fill,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: Colors.blueGrey[50],
                      child: const Center(
                        child: Text(
                          'Background Image Missing\nPlease place the image at:\nassets/c-background.png',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 18),
                        ),
                      ),
                    );
                  },
                ),
              ),
              // Clickable Regions
              ...appRegions.map((region) {
                final box = region['box_2d'] as List<int>;
                final name = region['civilian_name'] as String;
                // Coordinates format: [ymin, xmin, ymax, xmax] scaled by 1000
                final top = (box[0] / 1000.0) * height;
                final left = (box[1] / 1000.0) * width;
                final bottom = (box[2] / 1000.0) * height;
                final right = (box[3] / 1000.0) * width;

                final w = right - left;
                final h = bottom - top;

                return Positioned(
                  top: top,
                  left: left,
                  width: w,
                  height: h,
                  child: GestureDetector(
                    onTap: () {
                      if (name == 'Be a volunteer') {
                        showDialog(
                          context: context,
                          builder: (context) =>
                              const VolunteerVerificationDialog(),
                        );
                      } else if (name == 'Profile') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const ProfilePage(),
                          ),
                        );
                      } else {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => DetailsPage(title: name),
                          ),
                        );
                      }
                    },
                    child: Container(color: Colors.transparent),
                  ),
                );
              }),
            ],
          );
        },
      ),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  bool isLogin = true;
  bool isLoading = false;
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final nameController = TextEditingController();
  final dobController = TextEditingController();
  final phoneController = TextEditingController();
  final locationController = TextEditingController();

  Future<void> submit() async {
    setState(() => isLoading = true);
    final url = isLogin ? 'http://127.0.0.1:3000/login' : 'http://127.0.0.1:3000/register';
    
    final body = isLogin 
      ? {
          'email': emailController.text.trim(),
          'password': passwordController.text,
        }
      : {
          'email': emailController.text.trim(),
          'password': passwordController.text,
          'name': nameController.text.trim(),
          'dob': dobController.text.trim(),
          'phone': phoneController.text.trim(),
          'location': locationController.text.trim(),
        };

    try {
      final res = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 200 || res.statusCode == 201) {
        globalUserEmail = data['user']['email'];
        globalJwtToken = data['token'];
        globalUserData = data['user'];
        
        final isVolunteer = data['user']['isVolunteer'] == true;
        if (isVolunteer) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const BackgroundMapPage()),
          );
        } else {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const CivilianDashboardPage()),
          );
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['error'] ?? 'Error')));
      }
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Connection Error: $e')));
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset('assets/background.jpg', fit: BoxFit.cover),
          ),
          Positioned.fill(
            child: Container(color: Colors.black.withOpacity(0.5)),
          ),
          Center(
            child: SingleChildScrollView(
              child: Card(
                margin: const EdgeInsets.all(20),
                color: Colors.white.withOpacity(0.95),
                child: Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        isLogin ? 'Login' : 'Register',
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 20),
                      TextField(
                        controller: emailController,
                        decoration: const InputDecoration(labelText: 'Email'),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: passwordController,
                        decoration: const InputDecoration(labelText: 'Password'),
                        obscureText: true,
                      ),
                      if (!isLogin) ...[
                        const SizedBox(height: 10),
                        TextField(
                          controller: nameController,
                          decoration: const InputDecoration(labelText: 'Full Name'),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: dobController,
                          decoration: const InputDecoration(labelText: 'Date of Birth (YYYY-MM-DD)'),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: phoneController,
                          decoration: const InputDecoration(labelText: 'Phone Number'),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: locationController,
                          decoration: const InputDecoration(labelText: 'Location / Address'),
                        ),
                      ],
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: isLoading ? null : submit,
                        child: isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator())
                            : Text(isLogin ? 'Login' : 'Register'),
                      ),
                      const SizedBox(height: 10),
                      TextButton(
                        onPressed: () {
                          setState(() {
                            isLogin = !isLogin;
                          });
                        },
                        child: Text(
                          isLogin
                              ? 'Create an account'
                              : 'Already have an account? Login',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class VolunteerVerificationDialog extends StatefulWidget {
  const VolunteerVerificationDialog({super.key});

  @override
  State<VolunteerVerificationDialog> createState() =>
      _VolunteerVerificationDialogState();
}

class _VolunteerVerificationDialogState
    extends State<VolunteerVerificationDialog> {
  bool isLoading = false;

  Future<void> submitApplication() async {
    if (globalUserEmail == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please login first!')));
      return;
    }
    setState(() => isLoading = true);
    try {
      final res = await http.post(
        Uri.parse('http://127.0.0.1:3000/upgrade-volunteer'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $globalJwtToken',
        },
      );
      if (res.statusCode == 200) {
        Navigator.pop(context);
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const BackgroundMapPage()),
        );
      } else {
        final data = jsonDecode(res.body);
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['error'] ?? 'Error')));
      }
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Connection Error: $e')));
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white.withOpacity(0.95),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Volunteer Verification',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            const TextField(
              decoration: InputDecoration(labelText: 'Full Name'),
            ),
            const SizedBox(height: 10),
            const TextField(
              decoration: InputDecoration(
                labelText: 'Identification Proof (ID Number)',
              ),
            ),
            const SizedBox(height: 15),
            ElevatedButton.icon(
              icon: const Icon(Icons.upload_file),
              onPressed: () {},
              label: const Text('Upload Document'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: isLoading ? null : submitApplication,
              child: isLoading
                  ? const SizedBox(
                      width: 20, height: 20, child: CircularProgressIndicator())
                  : const Text('Submit Application'),
            ),
          ],
        ),
      ),
    );
  }
}

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  Map<String, dynamic>? profileData = globalUserData;
  bool isLoading = false;
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    fetchProfile();
  }

  Future<void> fetchProfile() async {
    if (globalJwtToken == null) return;
    setState(() {
      isLoading = true;
      errorMessage = null;
    });
    try {
      final res = await http.get(
        Uri.parse('http://127.0.0.1:3000/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $globalJwtToken',
        },
      );
      if (res.statusCode == 200) {
        setState(() {
          profileData = jsonDecode(res.body);
          globalUserData = profileData;
        });
      } else {
        setState(() {
          errorMessage = 'Failed to load profile. Error code: ${res.statusCode}';
        });
      }
    } catch (e) {
      setState(() {
        errorMessage = 'Network error: $e';
      });
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blueGrey[50],
      appBar: AppBar(
        title: const Text('My Profile'),
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: isLoading
            ? const CircularProgressIndicator()
            : errorMessage != null
                ? Text(errorMessage!, style: const TextStyle(color: Colors.red))
                : profileData == null
                    ? const Text('No profile data found.')
                    : SingleChildScrollView(
                        child: Card(
                          margin: const EdgeInsets.all(20),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(32.0),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const CircleAvatar(
                                  radius: 50,
                                  backgroundColor: Colors.deepPurple,
                                  child: Icon(Icons.person, size: 50, color: Colors.white),
                                ),
                                const SizedBox(height: 20),
                                Text(
                                  profileData!['name'] ?? 'Unknown Name',
                                  style: const TextStyle(
                                      fontSize: 28, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 10),
                                Chip(
                                  label: Text(
                                    profileData!['isVolunteer'] == true
                                        ? 'Verified Volunteer'
                                        : 'Civilian',
                                    style: const TextStyle(color: Colors.white),
                                  ),
                                  backgroundColor: profileData!['isVolunteer'] == true
                                      ? Colors.green
                                      : Colors.blue,
                                ),
                                const Divider(height: 40),
                                ListTile(
                                  leading: const Icon(Icons.email),
                                  title: const Text('Email'),
                                  subtitle: Text(profileData!['email'] ?? 'N/A'),
                                ),
                                ListTile(
                                  leading: const Icon(Icons.phone),
                                  title: const Text('Phone'),
                                  subtitle: Text(profileData!['phone'] ?? 'N/A'),
                                ),
                                ListTile(
                                  leading: const Icon(Icons.cake),
                                  title: const Text('Date of Birth'),
                                  subtitle: Text(profileData!['dob'] ?? 'N/A'),
                                ),
                                ListTile(
                                  leading: const Icon(Icons.location_on),
                                  title: const Text('Location'),
                                  subtitle: Text(profileData!['location'] ?? 'N/A'),
                                ),
                                const SizedBox(height: 20),
                                ElevatedButton.icon(
                                  onPressed: () {
                                    globalUserEmail = null;
                                    globalJwtToken = null;
                                    globalUserData = null;
                                    Navigator.pushAndRemoveUntil(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => const LoginPage(),
                                      ),
                                      (Route<dynamic> route) => false,
                                    );
                                  },
                                  icon: const Icon(Icons.logout),
                                  label: const Text('Logout'),
                                  style: ElevatedButton.styleFrom(
                                    foregroundColor: Colors.red,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
      ),
    );
  }
}
