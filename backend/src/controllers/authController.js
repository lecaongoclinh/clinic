import userService from '../services/authService.js';

const authController = {
    register: async (req, res) => {
        try {
            const userId = await userService.register(req.body);
            res.status(201).json({ message: 'Đăng ký thành công', userId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    login: async (req, res) => {
        try {
            const { username, password } = req.body;
            const data = await userService.login(username, password);
            res.status(200).json(data);
        } catch (error) {
            res.status(401).json({ error: error.message });
        }   
    }
};

export default authController;