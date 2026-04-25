import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

String? globalUserEmail;

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
                        Navigator.pop(context);
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

  Future<void> submit() async {
    setState(() => isLoading = true);
    final url = isLogin ? 'http://127.0.0.1:3000/login' : 'http://127.0.0.1:3000/register';
    try {
      final res = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': emailController.text.trim(),
          'password': passwordController.text,
        }),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 200 || res.statusCode == 201) {
        globalUserEmail = data['user']['email'];
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
      setState(() => isLoading = false);
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
                        const TextField(
                          decoration: InputDecoration(
                            labelText: 'Confirm Password',
                          ),
                          obscureText: true,
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
                      const Divider(height: 30),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.bolt),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.deepPurple,
                          foregroundColor: Colors.white,
                        ),
                        onPressed: () {
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(
                              builder: (context) =>
                                  const CivilianDashboardPage(),
                            ),
                          );
                        },
                        label: const Text('Demo Login'),
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
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': globalUserEmail}),
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
            const Divider(height: 30),
            ElevatedButton.icon(
              icon: const Icon(Icons.bolt),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.deepPurple,
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                Navigator.pop(context); // Close dialog
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const BackgroundMapPage(),
                  ),
                );
              },
              label: const Text('Demo Login (Bypass)'),
            ),
          ],
        ),
      ),
    );
  }
}
