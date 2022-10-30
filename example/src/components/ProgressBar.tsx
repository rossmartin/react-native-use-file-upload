import React from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  value: number;
  progressColor?: ViewStyle['backgroundColor'];
  style?: StyleProp<ViewStyle>;
};

export default function ProgressBar({
  value,
  style,
  progressColor = '#3880ff',
}: Props) {
  const valueAnimated = React.useRef(new Animated.Value(0)).current;
  const width = valueAnimated.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  React.useEffect(() => {
    Animated.timing(valueAnimated, {
      toValue: value,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [value]);

  return (
    <View style={[styles.progressBar, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: progressColor, width },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  progressBar: {
    height: 10,
    width: '100%',
    backgroundColor: '#fff',
    borderColor: '#708090',
    borderWidth: 1,
    borderRadius: 4,
  },
});
