import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:4000',
);
// TODO: For development only. Replace with a test JWT from your backend.
// Example: log in as admin in the web app, grab the token, and paste it here.
const String testOrdersJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWoxazZrMzkwMDAwZDc5Y3JrNWF2N3A1Iiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY1NDY0OTQ3LCJleHAiOjE3NjU1NTEzNDd9.aNV50-6QSIjUvJNcctiCz3zfYT4L_31URG43noaYz1E';

Future<void> saveAuthToken(String token) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('authToken', token);
}

Future<String?> loadAuthToken() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString('authToken');
}

Future<void> clearAuthToken() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove('authToken');
  await prefs.remove('userEmail');
  await prefs.remove('userFullName');
  await prefs.remove('userRole');
  await prefs.remove('userStudentId');
  await prefs.remove('userGradeLevel');
  await prefs.remove('userSection');
}

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        // This is the theme of your application.
        //
        // TRY THIS: Try running your application with "flutter run". You'll see
        // the application has a purple toolbar. Then, without quitting the app,
        // try changing the seedColor in the colorScheme below to Colors.green
        // and then invoke "hot reload" (save your changes or press the "hot
        // reload" button in a Flutter-supported IDE, or press "r" if you used
        // the command line to start the app).
        //
        // Notice that the counter didn't reset back to zero; the application
        // state is not lost during the reload. To reset the state, use hot
        // restart instead.
        //
        // This works for code too, not just values: Most code changes can be
        // tested with just a hot reload.
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
      ),
      home: const MyHomePage(title: 'PLSP Ordering'),
    );
  }
}

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool _loading = true;
  String? _email;
  String? _fullName;
  String? _role;
  String? _studentId;
  String? _gradeLevel;
  String? _section;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final email = prefs.getString('userEmail');
    final fullName = prefs.getString('userFullName');
    final role = prefs.getString('userRole');
    final studentId = prefs.getString('userStudentId');
    final gradeLevel = prefs.getString('userGradeLevel');
    final section = prefs.getString('userSection');

    if (!mounted) return;

    setState(() {
      _email = (email != null && email.isNotEmpty) ? email : null;
      _fullName = (fullName != null && fullName.isNotEmpty) ? fullName : null;
      _role = (role != null && role.isNotEmpty) ? role : null;
      _studentId = (studentId != null && studentId.isNotEmpty) ? studentId : null;
      _gradeLevel = (gradeLevel != null && gradeLevel.isNotEmpty) ? gradeLevel : null;
      _section = (section != null && section.isNotEmpty) ? section : null;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : (_email == null && _fullName == null)
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No user information found. Please log in.'),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_fullName != null)
                      Text(
                        _fullName!,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    if (_email != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        _email!,
                        style: const TextStyle(color: Colors.black54),
                      ),
                    ],
                    const SizedBox(height: 16),
                    if (_role != null)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Role'),
                        subtitle: Text(_role!),
                      ),
                    if (_studentId != null)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Student ID'),
                        subtitle: Text(_studentId!),
                      ),
                    if (_gradeLevel != null)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Grade Level'),
                        subtitle: Text(_gradeLevel!),
                      ),
                    if (_section != null)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Section'),
                        subtitle: Text(_section!),
                      ),
                  ],
                ),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  // This widget is the home page of your application. It is stateful, meaning
  // that it has a State object (defined below) that contains fields that affect
  // how it looks.

  // This class is the configuration for the state. It holds the values (in this
  // case the title) provided by the parent (in this case the App widget) and
  // used by the build method of the State. Fields in a Widget subclass are
  // always marked "final".

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _CartItem {
  final Map<String, dynamic> product;
  int quantity;

  _CartItem({
    required this.product,
    this.quantity = 1,
  });
}

class _MyHomePageState extends State<MyHomePage> {
  List<dynamic> _categories = [];
  List<dynamic> _products = [];
  bool _loading = true;
  String? _error;

  String? _selectedCategoryId;

  final List<_CartItem> _cartItems = [];

  bool _placingOrder = false;

  String? _userFullName;
  String? _userEmail;
  String? _userGradeLevel;
  String? _userSection;

  final TextEditingController _pickupLocationController =
      TextEditingController();

  DateTime? _pickupSchedule;

  int get _cartItemCount {
    int total = 0;
    for (final item in _cartItems) {
      total += item.quantity;
    }
    return total;
  }

  double get _cartTotal {
    double total = 0;
    for (final item in _cartItems) {
      final product = item.product;
      final priceStr = product['basePrice']?.toString() ?? '0';
      final price = double.tryParse(priceStr) ?? 0;
      total += price * item.quantity;
    }
    return total;
  }

  List<dynamic> get _visibleProducts {
    if (_selectedCategoryId == null) return _products;
    return _products.where((p) {
      final prod = p as Map<String, dynamic>;
      final productCategoryId = prod['categoryId'];
      return productCategoryId != null &&
          productCategoryId.toString() == _selectedCategoryId;
    }).toList();
  }

  Future<void> _loadCurrentUser() async {
    final prefs = await SharedPreferences.getInstance();
    final email = prefs.getString('userEmail');
    final fullName = prefs.getString('userFullName');
    final gradeLevel = prefs.getString('userGradeLevel');
    final section = prefs.getString('userSection');

    if (!mounted) return;

    setState(() {
      _userEmail = (email != null && email.isNotEmpty) ? email : null;
      _userFullName = (fullName != null && fullName.isNotEmpty) ? fullName : null;
      _userGradeLevel =
          (gradeLevel != null && gradeLevel.isNotEmpty) ? gradeLevel : null;
      _userSection =
          (section != null && section.isNotEmpty) ? section : null;
    });
  }

  Future<void> _openLogin() async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (context) => const LoginPage()),
    );

    if (result == true) {
      await _loadCurrentUser();
    }
  }

  void _openProfile() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const ProfilePage()),
    );
  }

  void _openMyOrders() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const MyOrdersPage()),
    );
  }

  @override
  void initState() {
    super.initState();
    _loadData();
    _loadCurrentUser();
  }

  @override
  void dispose() {
    _pickupLocationController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final categoriesRes =
          await http.get(Uri.parse('$apiBaseUrl/categories'));
      final productsRes = await http.get(Uri.parse('$apiBaseUrl/products'));

      if (categoriesRes.statusCode != 200 || productsRes.statusCode != 200) {
        throw Exception('Failed to load data');
      }

      final categoriesJson = jsonDecode(categoriesRes.body) as List<dynamic>;
      final productsJson = jsonDecode(productsRes.body) as List<dynamic>;

      setState(() {
        _categories = categoriesJson;
        _products = productsJson;
        _selectedCategoryId = null;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load data';
        _loading = false;
      });
    }
  }

  void _addToCart(Map<String, dynamic> product) {
    final productId = product['id']?.toString();
    if (productId == null) return;

    setState(() {
      final existingIndex = _cartItems.indexWhere(
        (item) => item.product['id']?.toString() == productId,
      );

      if (existingIndex >= 0) {
        _cartItems[existingIndex].quantity += 1;
      } else {
        _cartItems.add(_CartItem(product: product, quantity: 1));
      }
    });

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product['name'] ?? 'Item'} added to cart'),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  Future<void> _selectPickupSchedule() async {
    final now = DateTime.now();
    final initialDate = _pickupSchedule ?? now;

    final date = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: now,
      lastDate: now.add(const Duration(days: 30)),
    );

    if (date == null) {
      return;
    }

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_pickupSchedule ?? now),
    );

    if (time == null) {
      return;
    }

    final selected = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );

    setState(() {
      _pickupSchedule = selected;
    });
  }

  String _formatPickupSchedule(DateTime dt) {
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return '$y-$m-$d $hh:$mm';
  }

  void _showCartDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Cart'),
          content: _cartItems.isEmpty
              ? const Text('Your cart is empty.')
              : SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Total: ₱${_cartTotal.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _pickupLocationController,
                        decoration: const InputDecoration(
                          labelText: 'Pickup location',
                          hintText: 'e.g. Campus Store',
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              _pickupSchedule == null
                                  ? 'No pickup schedule selected'
                                  : 'Pickup: ${_formatPickupSchedule(_pickupSchedule!)}',
                            ),
                          ),
                          TextButton(
                            onPressed: _selectPickupSchedule,
                            child: const Text('Select'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ..._cartItems.map((item) {
                        final product = item.product;
                        final name = product['name'] ?? '';
                        final priceStr =
                            product['basePrice']?.toString() ?? '0';
                        final price = double.tryParse(priceStr) ?? 0;
                        final lineTotal = price * item.quantity;

                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(name),
                          subtitle: Text('Qty: ${item.quantity}'),
                          trailing: Text(
                            '₱${lineTotal.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('Close'),
            ),
            ElevatedButton(
              onPressed: _placingOrder
                  ? null
                  : () {
                      _placeOrder();
                    },
              child: _placingOrder
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Place Order'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _placeOrder() async {
    final storedToken = await loadAuthToken();
    final token = storedToken ?? (testOrdersJwt.isNotEmpty ? testOrdersJwt : null);

    if (token == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please log in first.'),
        ),
      );
      return;
    }

    if (_cartItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Your cart is empty.'),
        ),
      );
      return;
    }

    final itemsPayload = _cartItems
        .map((item) {
          final product = item.product;
          final productId = product['id']?.toString();
          if (productId == null) return null;
          return {
            'productId': productId,
            'quantity': item.quantity,
          };
        })
        .where((e) => e != null)
        .toList();

    if (itemsPayload.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to build order items.'),
        ),
      );
      return;
    }

    setState(() {
      _placingOrder = true;
    });

    final pickupLocation = _pickupLocationController.text.trim();
    final pickupSchedule = _pickupSchedule;

    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl/orders'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'items': itemsPayload,
          'paymentMethod': 'CASH_ON_PICKUP',
          if (pickupLocation.isNotEmpty) 'pickupLocation': pickupLocation,
          if (pickupSchedule != null)
            'pickupSchedule': pickupSchedule.toIso8601String(),
        }),
      );

      if (response.statusCode == 201) {
        setState(() {
          _cartItems.clear();
          _placingOrder = false;
          _pickupSchedule = null;
        });
        _pickupLocationController.clear();
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Order placed successfully.'),
          ),
        );
      } else {
        setState(() {
          _placingOrder = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Failed to place order (status ${response.statusCode}).',
            ),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _placingOrder = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Error placing order.'),
        ),
      );
    }
  }

  Future<void> _logout() async {
    await clearAuthToken();

    if (!mounted) return;

    setState(() {
      _userEmail = null;
      _userFullName = null;
      _userGradeLevel = null;
      _userSection = null;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Logged out.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: _userFullName == null
            ? Text(widget.title)
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.title),
                  Text(
                    _userFullName!,
                    style: const TextStyle(fontSize: 12),
                  ),
                  if (_userGradeLevel != null || _userSection != null)
                    Text(
                      [
                        if (_userGradeLevel != null) _userGradeLevel!,
                        if (_userSection != null) _userSection!,
                      ].join(' '),
                      style: const TextStyle(fontSize: 11),
                    ),
                ],
              ),
        actions: [
          IconButton(
            icon: Icon(
              _userFullName != null || _userEmail != null
                  ? Icons.logout
                  : Icons.person,
            ),
            tooltip:
                _userFullName != null || _userEmail != null ? 'Logout' : 'Login',
            onPressed: () {
              if (_userFullName != null || _userEmail != null) {
                _logout();
              } else {
                _openLogin();
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.account_circle),
            tooltip: 'Profile',
            onPressed: _openProfile,
          ),
          IconButton(
            icon: const Icon(Icons.receipt_long),
            tooltip: 'My Orders',
            onPressed: _openMyOrders,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: _loadData,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      const Text(
                        'Categories',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 40,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: _categories.length + 1,
                          separatorBuilder: (_, __) =>
                              const SizedBox(width: 8),
                          itemBuilder: (context, index) {
                            if (index == 0) {
                              final bool isSelected =
                                  _selectedCategoryId == null;
                              return ChoiceChip(
                                label: const Text('All'),
                                selected: isSelected,
                                onSelected: (_) {
                                  setState(() {
                                    _selectedCategoryId = null;
                                  });
                                },
                              );
                            }

                            final cat = _categories[index - 1]
                                as Map<String, dynamic>;
                            final String? categoryId =
                                cat['id']?.toString();
                            final bool isSelected =
                                _selectedCategoryId == categoryId;

                            return ChoiceChip(
                              label: Text(cat['name'] ?? ''),
                              selected: isSelected,
                              onSelected: (_) {
                                setState(() {
                                  _selectedCategoryId = categoryId;
                                });
                              },
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Products',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (_visibleProducts.isEmpty)
                        const Text(
                          'No products available for this category yet. Please check again later.',
                        )
                      else
                        ..._visibleProducts.map((p) {
                          final prod = p as Map<String, dynamic>;
                          final category =
                              prod['category'] as Map<String, dynamic>?;

                          final priceStr =
                              prod['basePrice']?.toString() ?? '0';
                          final price = double.tryParse(priceStr) ?? 0;

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              title: Text(prod['name'] ?? ''),
                              subtitle: Text(
                                category != null
                                    ? category['name'] ?? ''
                                    : '',
                              ),
                              isThreeLine: true,
                              trailing: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      '₱${price.toStringAsFixed(2)}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    OutlinedButton(
                                      onPressed: () => _addToCart(prod),
                                      child: const Text('Add'),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }),
                    ],
                  ),
                ),
      bottomNavigationBar: _cartItems.isEmpty
          ? null
          : Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: Theme.of(context).colorScheme.primaryContainer,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '$_cartItemCount item${_cartItemCount == 1 ? '' : 's'}',
                      ),
                      Text(
                        '₱${_cartTotal.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  ElevatedButton(
                    onPressed: _showCartDialog,
                    child: const Text('View Cart'),
                  ),
                ],
              ),
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
  final TextEditingController _emailController =
      TextEditingController(text: 'student1@plsp.edu');
  final TextEditingController _passwordController =
      TextEditingController(text: 'student123');

  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() {
        _error = 'Email and password are required.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl/auth/mobile-login'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final token = data['token'] as String?;

        if (token == null) {
          setState(() {
            _loading = false;
            _error = 'No token returned from server.';
          });
          return;
        }

        await saveAuthToken(token);

        final user = data['user'] as Map<String, dynamic>?;
        final prefs = await SharedPreferences.getInstance();
        if (user != null) {
          await prefs.setString(
            'userEmail',
            user['email']?.toString() ?? '',
          );
          await prefs.setString(
            'userFullName',
            user['fullName']?.toString() ?? '',
          );
          await prefs.setString(
            'userRole',
            user['role']?.toString() ?? '',
          );
          await prefs.setString(
            'userStudentId',
            user['studentId']?.toString() ?? '',
          );
          await prefs.setString(
            'userGradeLevel',
            user['gradeLevel']?.toString() ?? '',
          );
          await prefs.setString(
            'userSection',
            user['section']?.toString() ?? '',
          );
        } else {
          await prefs.remove('userEmail');
          await prefs.remove('userFullName');
          await prefs.remove('userRole');
          await prefs.remove('userStudentId');
          await prefs.remove('userGradeLevel');
          await prefs.remove('userSection');
        }

        if (!mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Logged in successfully.')),
        );

        Navigator.of(context).pop(true);
      } else {
        setState(() {
          _loading = false;
          _error = 'Login failed (status ${response.statusCode}).';
        });
      }
    } catch (e) {
      setState(() {
        _loading = false;
        _error = 'Error logging in.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Login'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null) ...[
              Text(
                _error!,
                style: const TextStyle(color: Colors.red),
              ),
              const SizedBox(height: 12),
            ],
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Email',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _passwordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Password',
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text('Login'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MyOrdersPage extends StatefulWidget {
  const MyOrdersPage({super.key});

  @override
  State<MyOrdersPage> createState() => _MyOrdersPageState();
}

class _MyOrdersPageState extends State<MyOrdersPage> {
  bool _loading = true;
  String? _error;
  List<dynamic> _orders = [];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final storedToken = await loadAuthToken();
    final token = storedToken ?? (testOrdersJwt.isNotEmpty ? testOrdersJwt : null);

    if (token == null) {
      setState(() {
        _error = 'Please log in first.';
        _loading = false;
      });
      return;
    }

    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl/orders'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode != 200) {
        setState(() {
          _error = 'Failed to load orders (status ${response.statusCode}).';
          _loading = false;
        });
        return;
      }

      final data = jsonDecode(response.body) as List<dynamic>;

      setState(() {
        _orders = data;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Error loading orders.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Orders'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: _loadOrders,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadOrders,
                  child: _orders.isEmpty
                      ? ListView(
                          padding: const EdgeInsets.all(16),
                          children: const [
                            SizedBox(height: 32),
                            Center(
                              child: Text(
                                'No orders yet. Orders you place will appear here.',
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ],
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _orders.length,
                          itemBuilder: (context, index) {
                            final order =
                                _orders[index] as Map<String, dynamic>;

                            final totalRaw = order['totalAmount'];
                            double totalAmount = 0;
                            if (totalRaw is num) {
                              totalAmount = totalRaw.toDouble();
                            } else if (totalRaw is String) {
                              totalAmount = double.tryParse(totalRaw) ?? 0;
                            }
                            final status =
                                order['status']?.toString() ?? '';
                            final createdAtStr =
                                order['createdAt']?.toString();

                            String dateLabel = '';
                            if (createdAtStr != null) {
                              final dt = DateTime.tryParse(createdAtStr);
                              if (dt != null) {
                                final y = dt.year
                                    .toString()
                                    .padLeft(4, '0');
                                final m = dt.month
                                    .toString()
                                    .padLeft(2, '0');
                                final d =
                                    dt.day.toString().padLeft(2, '0');
                                final hh =
                                    dt.hour.toString().padLeft(2, '0');
                                final mm = dt.minute
                                    .toString()
                                    .padLeft(2, '0');
                                dateLabel = '$y-$m-$d $hh:$mm';
                              }
                            }

                            int itemCount = 0;
                            final items = order['items'];
                            final List<String> itemDescriptions = [];
                            if (items is List) {
                              for (final it in items) {
                                if (it is Map<String, dynamic>) {
                                  final qty = it['quantity'];
                                  int? qtyInt;
                                  if (qty is int) {
                                    qtyInt = qty;
                                    itemCount += qtyInt;
                                  }

                                  String productName = 'Item';
                                  final product = it['product'];
                                  if (product is Map<String, dynamic>) {
                                    productName =
                                        product['name']?.toString() ?? 'Item';
                                  }

                                  String? variantName;
                                  final variant = it['variant'];
                                  if (variant is Map<String, dynamic>) {
                                    variantName =
                                        variant['name']?.toString();
                                  }

                                  String label = productName;
                                  if (variantName != null &&
                                      variantName.isNotEmpty) {
                                    label = '$productName ($variantName)';
                                  }
                                  if (qtyInt != null) {
                                    label = '$label x$qtyInt';
                                  }

                                  itemDescriptions.add(label);
                                }
                              }
                            }

                            final pickupLocation =
                                order['pickupLocation']?.toString();
                            final pickupScheduleStr =
                                order['pickupSchedule']?.toString();

                            String pickupScheduleLabel = '';
                            if (pickupScheduleStr != null) {
                              final ps = DateTime.tryParse(pickupScheduleStr);
                              if (ps != null) {
                                final y = ps.year.toString().padLeft(4, '0');
                                final m = ps.month.toString().padLeft(2, '0');
                                final d = ps.day.toString().padLeft(2, '0');
                                final hh = ps.hour.toString().padLeft(2, '0');
                                final mm = ps.minute.toString().padLeft(2, '0');
                                pickupScheduleLabel = '$y-$m-$d $hh:$mm';
                              }
                            }

                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                title: Text(
                                  dateLabel.isNotEmpty
                                      ? dateLabel
                                      : 'Order ${index + 1}',
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '₱${totalAmount.toStringAsFixed(2)} • $itemCount item${itemCount == 1 ? '' : 's'}',
                                    ),
                                    if ((pickupLocation != null &&
                                            pickupLocation.isNotEmpty) ||
                                        pickupScheduleLabel.isNotEmpty)
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(top: 2.0),
                                        child: Text(
                                          '${pickupLocation != null && pickupLocation.isNotEmpty ? 'Pickup: $pickupLocation' : ''}'
                                          '${pickupLocation != null && pickupLocation.isNotEmpty && pickupScheduleLabel.isNotEmpty ? '  •  ' : ''}'
                                          '${pickupScheduleLabel.isNotEmpty ? 'Schedule: $pickupScheduleLabel' : ''}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: Colors.black54,
                                          ),
                                        ),
                                      ),
                                    if (itemDescriptions.isNotEmpty)
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(top: 2.0),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: itemDescriptions
                                              .map(
                                                (line) => Text(
                                                  line,
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                  ),
                                                ),
                                              )
                                              .toList(),
                                        ),
                                      ),
                                  ],
                                ),
                                trailing: Text(
                                  status,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold),
                                ),
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (context) => OrderDetailPage(
                                        order: order,
                                      ),
                                    ),
                                  );
                                },
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}

class OrderDetailPage extends StatelessWidget {
  final Map<String, dynamic> order;

  const OrderDetailPage({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    final createdAtStr = order['createdAt']?.toString();
    DateTime? createdAt;
    if (createdAtStr != null) {
      createdAt = DateTime.tryParse(createdAtStr);
    }

    String createdAtLabel = '';
    if (createdAt != null) {
      final y = createdAt.year.toString().padLeft(4, '0');
      final m = createdAt.month.toString().padLeft(2, '0');
      final d = createdAt.day.toString().padLeft(2, '0');
      final hh = createdAt.hour.toString().padLeft(2, '0');
      final mm = createdAt.minute.toString().padLeft(2, '0');
      createdAtLabel = '$y-$m-$d $hh:$mm';
    }

    final orderId = order['id']?.toString();
    String shortOrderId = '';
    if (orderId != null && orderId.isNotEmpty) {
      shortOrderId = orderId.length > 8 ? orderId.substring(0, 8) : orderId;
    }

    final totalRaw = order['totalAmount'];
    double totalAmount = 0;
    if (totalRaw is num) {
      totalAmount = totalRaw.toDouble();
    } else if (totalRaw is String) {
      totalAmount = double.tryParse(totalRaw) ?? 0;
    }

    final status = order['status']?.toString() ?? '';
    final paymentMethod = order['paymentMethod']?.toString() ?? '';
    final paymentStatus = order['paymentStatus']?.toString() ?? '';

    final pickupLocation = order['pickupLocation']?.toString();
    final pickupScheduleStr = order['pickupSchedule']?.toString();

    String pickupScheduleLabel = '';
    if (pickupScheduleStr != null) {
      final ps = DateTime.tryParse(pickupScheduleStr);
      if (ps != null) {
        final y = ps.year.toString().padLeft(4, '0');
        final m = ps.month.toString().padLeft(2, '0');
        final d = ps.day.toString().padLeft(2, '0');
        final hh = ps.hour.toString().padLeft(2, '0');
        final mm = ps.minute.toString().padLeft(2, '0');
        pickupScheduleLabel = '$y-$m-$d $hh:$mm';
      }
    }

    final items = order['items'];
    final List<Map<String, dynamic>> parsedItems = [];
    if (items is List) {
      for (final it in items) {
        if (it is Map<String, dynamic>) {
          parsedItems.add(it);
        }
      }
    }

    int totalQuantity = 0;
    for (final it in parsedItems) {
      final qty = it['quantity'];
      if (qty is int) {
        totalQuantity += qty;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Details'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            Text(
              createdAtLabel.isNotEmpty
                  ? createdAtLabel
                  : 'Order Details',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (shortOrderId.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Text(
                  'Order ID: $shortOrderId',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.black54,
                  ),
                ),
              ),
            const SizedBox(height: 12),
            Card(
              elevation: 1,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Total: ₱${totalAmount.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.blueGrey.shade50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            status,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('Items: $totalQuantity'),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        if (paymentMethod.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.green.shade50,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'Method: $paymentMethod',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        if (paymentStatus.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade50,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'Payment: $paymentStatus',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            if ((pickupLocation != null && pickupLocation.isNotEmpty) ||
                pickupScheduleLabel.isNotEmpty)
              Card(
                elevation: 1,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Pickup Information',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (pickupLocation != null && pickupLocation.isNotEmpty)
                        Text('Location: $pickupLocation'),
                      if (pickupScheduleLabel.isNotEmpty)
                        Text('Schedule: $pickupScheduleLabel'),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 12),
            Card(
              elevation: 1,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Items',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...parsedItems.map((it) {
                      String productName = 'Item';
                      final product = it['product'];
                      if (product is Map<String, dynamic>) {
                        productName = product['name']?.toString() ?? 'Item';
                      }

                      String? variantName;
                      final variant = it['variant'];
                      if (variant is Map<String, dynamic>) {
                        variantName = variant['name']?.toString();
                      }

                      final qty = it['quantity'];
                      int qtyInt = 0;
                      if (qty is int) {
                        qtyInt = qty;
                      }

                      final lineTotalRaw = it['lineTotal'];
                      double lineTotal = 0;
                      if (lineTotalRaw is num) {
                        lineTotal = lineTotalRaw.toDouble();
                      } else if (lineTotalRaw is String) {
                        lineTotal = double.tryParse(lineTotalRaw) ?? 0;
                      }

                      String title = productName;
                      if (variantName != null && variantName.isNotEmpty) {
                        title = '$productName ($variantName)';
                      }

                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(title),
                        subtitle: Text('Qty: $qtyInt'),
                        trailing: Text(
                          '₱${lineTotal.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
