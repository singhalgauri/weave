import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

// For Android Emulator, use 10.0.2.2
// For Web or iOS Simulator, use 127.0.0.1
// For Physical Devices, use your computer's local Wi-Fi IP address (e.g., 192.168.x.x)
const String backendBaseUrl = 'http://10.90.131.179:5000';

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
                      } else if (name == 'Conduct a survey') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const SurveysListPage(),
                          ),
                        );
                      } else if (name == 'Task Region') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const VolunteerTasksPage(),
                          ),
                        );
                      } else if (name == 'Impact Region') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const ImpactDashboardPage(),
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
                      } else if (name == 'Report a problem') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const ReportProblemPage(),
                          ),
                        );
                      } else if (name == 'Available surveys') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const SurveysListPage(),
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
  final otpController = TextEditingController();
  bool otpSent = false;
  bool isSendingOtp = false;

  Future<void> sendOtp() async {
    if (phoneController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter phone number')));
      return;
    }
    setState(() => isSendingOtp = true);
    try {
      final res = await http.post(
        Uri.parse('$backendBaseUrl/send-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phone': phoneController.text.trim()}),
      );
      if (res.statusCode == 200) {
        setState(() => otpSent = true);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('OTP sent to WhatsApp!')));
      } else {
        final data = jsonDecode(res.body);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(data['error'] ?? 'Error sending OTP')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => isSendingOtp = false);
    }
  }

  double? _lat;
  double? _lng;

  Future<Position?> _determinePosition() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return null;

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return null;
    }
    
    if (permission == LocationPermission.deniedForever) return null;

    return await Geolocator.getCurrentPosition();
  }

  Future<void> submit() async {
    setState(() => isLoading = true);
    final url = isLogin ? '$backendBaseUrl/login' : '$backendBaseUrl/register';

    if (!isLogin) {
      try {
        final position = await _determinePosition();
        if (position != null) {
          _lat = position.latitude;
          _lng = position.longitude;
        }
      } catch (e) {
        // ignore
      }
    }

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
            'lat': _lat,
            'lng': _lng,
            'otp': otpController.text.trim(),
          };

    if (!isLogin && otpController.text.isEmpty) {
      setState(() => isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please verify your phone number with OTP')));
      return;
    }

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
            MaterialPageRoute(
              builder: (context) => const CivilianDashboardPage(),
            ),
          );
        }
      } else {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(data['error'] ?? 'Error')));
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Connection Error: $e')));
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
                        decoration: const InputDecoration(
                          labelText: 'Password',
                        ),
                        obscureText: true,
                      ),
                      if (!isLogin) ...[
                        const SizedBox(height: 10),
                        TextField(
                          controller: nameController,
                          decoration: const InputDecoration(
                            labelText: 'Full Name',
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: dobController,
                          decoration: const InputDecoration(
                            labelText: 'Date of Birth (YYYY-MM-DD)',
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: phoneController,
                                decoration: const InputDecoration(
                                  labelText: 'WhatsApp Phone Number',
                                ),
                              ),
                            ),
                            if (!otpSent)
                               TextButton(
                                 onPressed: isSendingOtp ? null : sendOtp,
                                 child: isSendingOtp ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Send OTP'),
                               )
                          ],
                        ),
                        if (otpSent) ...[
                          const SizedBox(height: 10),
                          TextField(
                            controller: otpController,
                            decoration: const InputDecoration(labelText: 'Enter OTP'),
                          ),
                        ],
                        const SizedBox(height: 10),
                        TextField(
                          controller: locationController,
                          decoration: const InputDecoration(
                            labelText: 'Location / Address',
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: isLoading ? null : submit,
                        child: isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(),
                              )
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please login first!')));
      return;
    }
    setState(() => isLoading = true);
    try {
      final res = await http.post(
        Uri.parse('$backendBaseUrl/upgrade-volunteer'),
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
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(data['error'] ?? 'Error')));
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Connection Error: $e')));
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
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(),
                    )
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
        Uri.parse('$backendBaseUrl/profile'),
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
          errorMessage =
              'Failed to load profile. Error code: ${res.statusCode}';
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
                          child: Icon(
                            Icons.person,
                            size: 50,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 20),
                        Text(
                          profileData!['name'] ?? 'Unknown Name',
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                          ),
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

class ReportProblemPage extends StatefulWidget {
  const ReportProblemPage({super.key});

  @override
  State<ReportProblemPage> createState() => _ReportProblemPageState();
}

class _ReportProblemPageState extends State<ReportProblemPage> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _locationController = TextEditingController();
  File? _image;
  bool _isLoading = false;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() {
        _image = File(pickedFile.path);
      });
    }
  }

  Future<void> _submitProblem() async {
    if (_titleController.text.isEmpty ||
        _descController.text.isEmpty ||
        _locationController.text.isEmpty ||
        _image == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all fields and select an image')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final uri = Uri.parse('$backendBaseUrl/report-problem');
      final request = http.MultipartRequest('POST', uri);
      
      request.headers['Authorization'] = 'Bearer $globalJwtToken';
      request.fields['title'] = _titleController.text;
      request.fields['description'] = _descController.text;
      request.fields['location'] = _locationController.text;
      
      request.files.add(
        await http.MultipartFile.fromPath('image', _image!.path),
      );

      final response = await request.send();
      final respStr = await response.stream.bytesToString();

      if (response.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Problem reported successfully!')),
          );
          Navigator.pop(context);
        }
      } else {
        final data = jsonDecode(respStr);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['error'] ?? 'Failed to report problem')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Report a Problem')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Title',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descController,
              decoration: const InputDecoration(
                labelText: 'Description',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _locationController,
              decoration: const InputDecoration(
                labelText: 'Location',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),
            _image == null
                ? Container(
                    height: 150,
                    width: double.infinity,
                    color: Colors.grey[200],
                    child: const Center(child: Text('No image selected.')),
                  )
                : Image.file(_image!, height: 200, width: double.infinity, fit: BoxFit.cover),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              icon: const Icon(Icons.image),
              label: const Text('Pick Image'),
              onPressed: _pickImage,
            ),
            const SizedBox(height: 32),
            _isLoading
                ? const CircularProgressIndicator()
                : SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _submitProblem,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text('Submit Problem', style: TextStyle(fontSize: 16)),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}

class SurveysListPage extends StatefulWidget {
  const SurveysListPage({super.key});

  @override
  State<SurveysListPage> createState() => _SurveysListPageState();
}

class _SurveysListPageState extends State<SurveysListPage> {
  List<dynamic> surveys = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    fetchSurveys();
  }

  Future<void> fetchSurveys() async {
    try {
      final res = await http.get(Uri.parse('$backendBaseUrl/surveys'));
      if (res.statusCode == 200) {
        setState(() {
          surveys = jsonDecode(res.body);
          isLoading = false;
        });
      } else {
        setState(() => isLoading = false);
      }
    } catch (e) {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Surveys')),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : surveys.isEmpty
              ? const Center(child: Text('No active surveys currently.'))
              : ListView.builder(
                  itemCount: surveys.length,
                  itemBuilder: (context, index) {
                    final s = surveys[index];
                    return Card(
                      margin: const EdgeInsets.all(8),
                      child: ListTile(
                        title: Text(s['title'] ?? 'Untitled Survey'),
                        subtitle: Text(s['description'] ?? ''),
                        trailing: const Icon(Icons.arrow_forward_ios),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => SurveyFormPage(survey: s),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}

class SurveyFormPage extends StatefulWidget {
  final Map<String, dynamic> survey;

  const SurveyFormPage({super.key, required this.survey});

  @override
  State<SurveyFormPage> createState() => _SurveyFormPageState();
}

class _SurveyFormPageState extends State<SurveyFormPage> {
  final Map<int, dynamic> _answers = {};
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final questions = widget.survey['questions'] as List<dynamic>? ?? [];
    for (int i = 0; i < questions.length; i++) {
      if (questions[i]['type'] == 'Checkboxes') {
        _answers[i] = <String>[];
      } else {
        _answers[i] = '';
      }
    }
  }

  Future<void> _submitForm() async {
    setState(() => _isLoading = true);

    final questions = widget.survey['questions'] as List<dynamic>? ?? [];
    List<Map<String, dynamic>> responses = [];

    for (int i = 0; i < questions.length; i++) {
      String answerString = '';
      if (_answers[i] is List) {
        answerString = (_answers[i] as List).join(', ');
      } else {
        answerString = _answers[i].toString();
      }

      responses.add({
        'questionId': questions[i]['id'] ?? i,
        'questionText': questions[i]['text'] ?? '',
        'answer': answerString,
      });
    }

    try {
      final res = await http.post(
        Uri.parse('$backendBaseUrl/surveys/${widget.survey['_id']}/responses'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $globalJwtToken',
        },
        body: jsonEncode({'responses': responses}),
      );

      final data = jsonDecode(res.body);
      if (res.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Survey submitted successfully!')),
          );
          Navigator.pop(context); // Go back
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['error'] ?? 'Failed to submit')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final questions = widget.survey['questions'] as List<dynamic>? ?? [];

    return Scaffold(
      appBar: AppBar(title: Text(widget.survey['title'] ?? 'Survey')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text(
              widget.survey['description'] ?? '',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: ListView.builder(
                itemCount: questions.length,
                itemBuilder: (context, index) {
                  final q = questions[index];
                  final String qType = q['type'] ?? 'Short Answer';
                  final List<dynamic> options = q['options'] ?? [];

                  Widget inputWidget;

                  if (qType == 'Multiple Choice') {
                    inputWidget = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: options.map((opt) {
                        return RadioListTile<String>(
                          title: Text(opt.toString()),
                          value: opt.toString(),
                          groupValue: _answers[index] as String,
                          onChanged: (val) {
                            setState(() => _answers[index] = val!);
                          },
                        );
                      }).toList(),
                    );
                  } else if (qType == 'Checkboxes') {
                    inputWidget = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: options.map((opt) {
                        final list = _answers[index] as List<String>;
                        final isChecked = list.contains(opt.toString());
                        return CheckboxListTile(
                          title: Text(opt.toString()),
                          value: isChecked,
                          onChanged: (val) {
                            setState(() {
                              if (val == true) {
                                list.add(opt.toString());
                              } else {
                                list.remove(opt.toString());
                              }
                            });
                          },
                        );
                      }).toList(),
                    );
                  } else {
                    inputWidget = TextField(
                      onChanged: (val) => _answers[index] = val,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                      ),
                    );
                  }

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          q['text'] ?? 'Question ${index + 1}',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        inputWidget,
                      ],
                    ),
                  );
                },
              ),
            ),
            _isLoading
                ? const CircularProgressIndicator()
                : SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _submitForm,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text('Submit Survey', style: TextStyle(fontSize: 16)),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}

class VolunteerTasksPage extends StatefulWidget {
  const VolunteerTasksPage({super.key});

  @override
  State<VolunteerTasksPage> createState() => _VolunteerTasksPageState();
}

class _VolunteerTasksPageState extends State<VolunteerTasksPage> {
  List<dynamic> tasks = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    fetchTasks();
  }

  Future<void> fetchTasks() async {
    try {
      final res = await http.get(
        Uri.parse('$backendBaseUrl/my-tasks'),
        headers: {'Authorization': 'Bearer $globalJwtToken'},
      );
      if (res.statusCode == 200) {
        setState(() {
          tasks = jsonDecode(res.body);
          isLoading = false;
        });
      } else {
        setState(() => isLoading = false);
      }
    } catch (e) {
      setState(() => isLoading = false);
    }
  }

  Future<void> respondToTask(String taskId, String response) async {
    try {
      final res = await http.post(
        Uri.parse('$backendBaseUrl/tasks/$taskId/respond'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $globalJwtToken',
        },
        body: jsonEncode({'response': response}),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Task ${response}ed successfully')),
        );

        // If accepted and calendar URL is available, offer to open it
        if (response == 'accept' && data['addToCalendarUrl'] != null) {
          final calUrl = data['addToCalendarUrl'] as String;
          if (mounted) {
            showDialog(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text('Add to Google Calendar?'),
                content: const Text('This task has been added to your schedule. Would you like to add it to your Google Calendar?'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Later'),
                  ),
                  ElevatedButton(
                    onPressed: () async {
                      Navigator.pop(ctx);
                      final uri = Uri.parse(calUrl);
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      }
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
                    child: const Text('Open Calendar', style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),
            );
          }
        }

        fetchTasks();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to respond to task')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Assigned Tasks')),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : tasks.isEmpty
              ? const Center(child: Text('No tasks assigned to you.'))
              : ListView.builder(
                  itemCount: tasks.length,
                  itemBuilder: (context, index) {
                    final t = tasks[index];
                    final String taskId = t['_id'];
                    final List<dynamic> assigned = t['assignedVolunteers'] ?? [];
                    final myAssignment = assigned.firstWhere(
                      (v) => v['email'] == globalUserEmail, 
                      orElse: () => null
                    );
                    final String status = myAssignment != null ? myAssignment['status'] : 'Pending';

                    return Card(
                      margin: const EdgeInsets.all(8),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              t['title'] ?? 'Untitled Task',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Text('Type: ${t['type']}'),
                            Text('Location: ${t['location']}'),
                            const SizedBox(height: 8),
                            Text(t['description'] ?? ''),

                            // ─── Schedule Info ───────────────────────────
                            if (t['scheduledDate'] != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.blue.shade50,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: Colors.blue.shade100),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.calendar_month, color: Colors.blue.shade400, size: 18),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            DateTime.parse(t['scheduledDate']).toLocal().toString().split(' ')[0] +
                                            (t['scheduledTime'] != null ? '  ${t['scheduledTime']}' : ''),
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              color: Colors.blue.shade700,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    // Add to Calendar Button
                                    TextButton.icon(
                                      onPressed: () async {
                                        final dateStr = DateTime.parse(t['scheduledDate'])
                                            .toUtc()
                                            .toIso8601String()
                                            .replaceAll(RegExp(r'[-:]'), '')
                                            .split('.')[0] + 'Z';
                                        final endStr = DateTime.parse(t['scheduledDate'])
                                            .toUtc()
                                            .add(const Duration(hours: 2))
                                            .toIso8601String()
                                            .replaceAll(RegExp(r'[-:]'), '')
                                            .split('.')[0] + 'Z';
                                        final calUrl = Uri.parse(
                                          'https://calendar.google.com/calendar/render?action=TEMPLATE'
                                          '&text=${Uri.encodeComponent('[Weave] ${t['title']}')}'  
                                          '&dates=$dateStr/$endStr'
                                          '&details=${Uri.encodeComponent(t['description'] ?? '')}'
                                          '&location=${Uri.encodeComponent(t['location'] ?? '')}'
                                        );
                                        if (await canLaunchUrl(calUrl)) {
                                          await launchUrl(calUrl, mode: LaunchMode.externalApplication);
                                        }
                                      },
                                      icon: const Icon(Icons.open_in_new, size: 14),
                                      label: const Text('Add', style: TextStyle(fontSize: 12)),
                                      style: TextButton.styleFrom(foregroundColor: Colors.blue),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Chip(
                                  label: Text(status),
                                  backgroundColor: status == 'Accepted' 
                                      ? Colors.green[100] 
                                      : status == 'Rejected' 
                                          ? Colors.red[100] 
                                          : Colors.orange[100],
                                ),
                                if (status == 'Pending')
                                  Row(
                                    children: [
                                      TextButton(
                                        onPressed: () => respondToTask(taskId, 'reject'),
                                        child: const Text('Reject', style: TextStyle(color: Colors.red)),
                                      ),
                                      const SizedBox(width: 8),
                                      ElevatedButton(
                                        onPressed: () => respondToTask(taskId, 'accept'),
                                        style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                                        child: const Text('Accept', style: TextStyle(color: Colors.white)),
                                      ),
                                    ],
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

class ImpactDashboardPage extends StatefulWidget {
  const ImpactDashboardPage({super.key});

  @override
  State<ImpactDashboardPage> createState() => _ImpactDashboardPageState();
}

class _ImpactDashboardPageState extends State<ImpactDashboardPage> {
  Map<String, dynamic>? impactData;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    fetchImpact();
  }

  Future<void> fetchImpact() async {
    try {
      final res = await http.get(
        Uri.parse('$backendBaseUrl/my-impact'),
        headers: {'Authorization': 'Bearer $globalJwtToken'},
      );
      if (res.statusCode == 200) {
        setState(() { impactData = jsonDecode(res.body); isLoading = false; });
      } else {
        setState(() => isLoading = false);
      }
    } catch (e) {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stats = impactData?['stats'] as Map<String, dynamic>? ?? {};
    final badges = impactData?['badges'] as List<dynamic>? ?? [];
    final completedTasks = impactData?['completedTasks'] as List<dynamic>? ?? [];

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(title: const Text('My Impact'), backgroundColor: Colors.deepPurple, foregroundColor: Colors.white),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF4a3e3e), Color(0xFF7b5ea7)]),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(children: [
                      const Text('Your Impact Score', style: TextStyle(color: Colors.white70, fontSize: 12, letterSpacing: 2)),
                      const SizedBox(height: 4),
                      Text('${stats['impactScore'] ?? 0}', style: const TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),
                      Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                        _StatChip(label: 'Tasks Done', value: '${stats['totalCompleted'] ?? 0}'),
                        _StatChip(label: 'High Urgency', value: '${stats['highUrgencyCompleted'] ?? 0}'),
                        _StatChip(label: 'Badges', value: '${badges.length}'),
                      ]),
                    ]),
                  ),
                  const SizedBox(height: 24),
                  const Text('Earned Badges', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  badges.isEmpty
                    ? const Text('Complete tasks to earn your first badge!', style: TextStyle(color: Colors.grey))
                    : Wrap(spacing: 10, runSpacing: 10, children: badges.map((b) => Chip(
                        avatar: Text(b['emoji'] ?? '', style: const TextStyle(fontSize: 16)),
                        label: Text(b['name'] ?? ''),
                        backgroundColor: Colors.purple.shade50,
                      )).toList()),
                  const SizedBox(height: 24),
                  const Text('Completed Tasks', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  completedTasks.isEmpty
                    ? const Text('No completed tasks yet.', style: TextStyle(color: Colors.grey))
                    : Column(children: completedTasks.map((t) => Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        child: ListTile(
                          leading: const Icon(Icons.check_circle, color: Colors.green),
                          title: Text(t['title'] ?? ''),
                          subtitle: Text('${t['type']} � ${t['location']}'),
                          trailing: Chip(label: Text('U:${t['urgency'] ?? 5}', style: const TextStyle(fontSize: 10))),
                        ),
                      )).toList()),
                ],
              ),
            ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  const _StatChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Text(value, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
      Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
    ]);
  }
}
