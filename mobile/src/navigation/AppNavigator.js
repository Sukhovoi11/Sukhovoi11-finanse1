import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import IncomeScreen from '../screens/IncomeScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import HistoryScreen from '../screens/HistoryScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import CategoryStatsScreen from '../screens/CategoryStatsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import RemindersScreen from '../screens/RemindersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GlobalLeaderboardScreen from '../screens/GlobalLeaderboardScreen';
import { useAppTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator({ isLoggedIn, onLogin, onLogout }) {
    const { colors } = useAppTheme();
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                  headerStyle: {
                    backgroundColor: colors.surface,
                  },
                  headerTintColor: colors.text,
                  headerTitleStyle: {
                    fontWeight: '800',
                    fontSize: 17,
                  },
                  headerTitleAlign: 'center',
                  headerShadowVisible: true,
                  contentStyle: {
                    backgroundColor: colors.background,
                  },
                }}

            >
                {!isLoggedIn ? (
                    <>
                        <Stack.Screen name="Login" options={{ title: 'Finanse+ – Zaloguj się' }}>
                            {(props) => <LoginScreen {...props} onLogin={onLogin} />}
                        </Stack.Screen>
                        <Stack.Screen name="Register" options={{ title: 'Utwórz konto Finanse+' }}>
                            {(props) => <RegisterScreen {...props} />}
                        </Stack.Screen>
                    </>
                ) : (
                    <>
                        <Stack.Screen
                            name="Dashboard"
                            options={{ title: 'Finanse osobiste', headerBackVisible: false, headerLeft: () => null }}
                        >
                            {(props) => <DashboardScreen {...props} />}
                        </Stack.Screen>

                        <Stack.Screen
                            name="Income"
                            component={IncomeScreen}
                            options={{ title: 'Dodaj przychód' }}
                        />
                        <Stack.Screen
                            name="Expenses"
                            component={ExpensesScreen}
                            options={{ title: 'Wydatki i kategorie', headerBackVisible: false, headerLeft: () => null }}
                        />
                        <Stack.Screen
                            name="History"
                            component={HistoryScreen}
                            options={{ title: 'Historia operacji', headerBackVisible: false, headerLeft: () => null }}
                        />
                        <Stack.Screen
                            name="Portfolio"
                            component={PortfolioScreen}
                            options={{ title: 'Portfele i konta' }}
                        />
                        <Stack.Screen
                            name="CategoryStats"
                            component={CategoryStatsScreen}
                            options={{ title: 'Statystyki wydatków' }}
                        />
                        <Stack.Screen
                            name="Goals"
                            component={GoalsScreen}
                            options={{ title: 'Plan i cele' }}
                        />
                        <Stack.Screen
                            name="Reminders"
                            component={RemindersScreen}
                            options={{ title: 'Przypomnienia o płatnościach' }}
                        />
                        <Stack.Screen
                            name="Leaderboard"
                            component={GlobalLeaderboardScreen}
                            options={{ title: 'Ranking spolecznosci' }}
                        />
                        <Stack.Screen
                            name="Profile"
                            options={{ title: 'Profil użytkownika', headerBackVisible: false, headerLeft: () => null }}
                        >
                            {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
                        </Stack.Screen>
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
