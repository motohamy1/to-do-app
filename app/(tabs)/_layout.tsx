import { View, Text } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router'

const _layout = () => {
  return (
    <Tabs 
        screenOptions={{
            tabBarActiveTintColor: 'blue',
            tabBarInactiveTintColor: 'black',
            tabBarStyle: {
                backgroundColor: '#9196efff',
                borderTopWidth: 1,
                borderTopColor: 'gray',
                height: 90,
                paddingBottom: 30,
                paddingTop: 10
            },
            headerStyle: {
                backgroundColor: '#9196efff',
            },
            headerShown: false,
        }}
    >
        <Tabs.Screen
            name='index'
            options={{
                title : 'To Do',
                tabBarIcon: ({color, size}) => (
                    <Ionicons name='flash-outline' color={color} size={size}/>
                )
            }}
        />
         <Tabs.Screen
            name='settings'
            options={{
                title : 'Settings',
                tabBarIcon: ({color, size}) => (
                    <Ionicons name='settings-outline' color={color} size={size}/>
                )
            }}
        />
    </Tabs>
  )
}

export default _layout