import React, { useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

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
  const [layoutWidth, setLayoutWidth] = useState<number>();
  const animatedStyle = useAnimatedStyle(() => {
    if (!layoutWidth) {
      return { width: 0 };
    }

    // subtract 2 to account for border
    const widthValue = (value / 100) * layoutWidth - 2;
    return {
      width: withSpring(widthValue, {
        overshootClamping: true,
        stiffness: 75,
      }),
    };
  }, [layoutWidth, value]);

  return (
    <View
      style={[styles.container, style]}
      onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          animatedStyle,
          { backgroundColor: progressColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 10,
    backgroundColor: '#fff',
    borderColor: '#708090',
    borderWidth: 1,
    borderRadius: 4,
  },
});
