
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import TelaHome from './screens/TelaHome';
import TelaGuardaRoupa from './screens/TelaGuardaRoupa';
import TelaFavoritos from './TelaFavoritos';

const Stack = createStackNavigator();

export default function Routes() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="TelaHome" component={TelaHome} />
        <Stack.Screen name="TelaGuardaRoupa" component={TelaGuardaRoupa} />
        <Stack.Screen name="TelaFavoritos" component={TelaFavoritos} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}