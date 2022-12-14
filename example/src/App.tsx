import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Button,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import SortableGrid, { ItemOrder } from 'react-native-sortable-grid';
import ReactNativeHapticFeedback, {
  HapticOptions,
} from 'react-native-haptic-feedback';
import FastImage from 'react-native-fast-image';

import ProgressBar from './components/ProgressBar';
import useFileUpload, { UploadItem, OnProgressData } from '../../src/index';
import { allSettled } from './util/general';
import placeholderImage from './img/placeholder.png';

const hapticFeedbackOptions: HapticOptions = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
};

interface Item extends UploadItem {
  progress?: number;
  failed?: boolean; // true on timeout or error
  completed?: boolean;
}

export default function App() {
  const [data, setData] = useState<Item[]>([]);
  const dragStartAnimatedValue = useRef(new Animated.Value(1));

  const { startUpload, abortUpload } = useFileUpload<Item>({
    url: 'http://localhost:8080/upload',
    field: 'file',
    // optional below
    method: 'POST',
    timeout: 60 * 1000, // you can set this lower to cause timeouts to happen
    onProgress,
    onDone: ({ item }) => {
      updateItem({
        item,
        keysAndValues: [
          {
            key: 'completed',
            value: true,
          },
        ],
      });
    },
    onError: ({ item }) => {
      updateItem({
        item,
        keysAndValues: [
          { key: 'progress', value: undefined },
          { key: 'failed', value: true },
        ],
      });
    },
    onTimeout: ({ item }) => {
      updateItem({
        item,
        keysAndValues: [
          { key: 'progress', value: undefined },
          { key: 'failed', value: true },
        ],
      });
    },
  });

  const isUploading = data.some(
    (item) =>
      typeof item.progress === 'number' &&
      item.progress > 0 &&
      item.progress < 100
  );

  const updateItem = <K extends keyof Item>({
    item,
    keysAndValues,
  }: {
    item: Item;
    keysAndValues: { key: K; value: Item[K] }[];
  }) => {
    setData((prevState) => {
      const newState = [...prevState];
      const itemToUpdate = newState.find((s) => s.uri === item.uri);

      if (itemToUpdate) {
        keysAndValues.forEach(({ key, value }) => {
          itemToUpdate[key] = value;
        });
      }

      return newState;
    });
  };

  function onProgress({ item, event }: OnProgressData<Item>) {
    const progress = event?.loaded
      ? Math.round((event.loaded / event.total) * 100)
      : 0;

    updateItem({
      item,
      keysAndValues: [{ key: 'progress', value: progress }],
    });
  }

  const onPressSelectMedia = async () => {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 0,
    });

    const items: Item[] =
      response?.assets?.map((a) => ({
        name: a.fileName!,
        type: a.type!,
        uri: a.uri!,
      })) ?? [];

    setData((prevState) => [...prevState, ...items]);
  };

  const putItOnTheLine = async (_data: Item[]) => {
    const promises = _data
      .filter((item) => typeof item.progress !== 'number') // leave out any in progress or completed
      .map((item) => startUpload(item));
    // use Promise.all here if you want an error from a timeout or error
    const result = await allSettled(promises);
    console.log('result: ', result);
  };

  const onPressUpload = () => {
    // allow uploading any that previously failed
    setData((prevState) => {
      const newState = [...prevState].map((item) => ({
        ...item,
        failed: false,
      }));

      putItOnTheLine(newState);

      return newState;
    });
  };

  const onPressDeleteItem = (item: Item) => () => {
    setData((prevState) => {
      const newState = [...prevState];
      const deleteIndex = prevState.findIndex((s) => s.uri === item.uri);

      if (deleteIndex > -1) {
        newState.splice(deleteIndex, 1);
      }

      return newState;
    });
    abortUpload(item.uri);
  };

  const onPressRetry = (item: Item) => () => {
    updateItem({
      item,
      keysAndValues: [
        {
          key: 'failed',
          value: false,
        },
      ],
    });
    startUpload({ ...item, failed: false }).catch(() => {});
  };

  const onDragStart = () => {
    ReactNativeHapticFeedback.trigger('impactMedium', hapticFeedbackOptions);
    dragStartAnimatedValue.current.setValue(1);
    // unable to set useNativeDriver true because of a limitation in react-native-sortable-grid
    Animated.loop(
      Animated.sequence([
        Animated.timing(dragStartAnimatedValue.current, {
          toValue: 1.1,
          useNativeDriver: false,
          duration: 300,
        }),
        Animated.timing(dragStartAnimatedValue.current, {
          toValue: 1,
          useNativeDriver: false,
          duration: 300,
        }),
      ])
    ).start();
  };

  const onDragRelease = (_itemOrder: ItemOrder) => {
    //console.log('onDragRelease, itemOrder: ', _itemOrder);
    // you can see where this can go :~)
  };

  const getDragStartAnimation = () => {
    return {
      transform: [
        {
          scale: dragStartAnimatedValue.current.interpolate({
            inputRange: [1, 1.1],
            outputRange: [1, 1.1],
          }),
        },
      ],
    };
  };

  const renderItem = (item: Item) => {
    const itemProgress = item.progress || 0;
    const showProgress = !item.failed && itemProgress > 0 && itemProgress < 100;

    return (
      <View key={item.uri} style={styles.imageBackground}>
        <FastImage
          source={{ uri: item.uri }}
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
          defaultSource={placeholderImage}
        />
        {showProgress ? (
          <ProgressBar value={itemProgress} style={styles.progressBar} />
        ) : null}
        {item.failed ? (
          <Pressable onPress={onPressRetry(item)}>
            <Text style={styles.iconText}>&#x21bb;</Text>
          </Pressable>
        ) : null}
        {item.completed ? <Text style={styles.iconText}>&#10003;</Text> : null}
        <Pressable style={styles.deleteIcon} onPress={onPressDeleteItem(item)}>
          <Text style={styles.deleteIconText}>&#x2717;</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.flexContainer}>
      <View style={styles.container}>
        <Button title="Select Media" onPress={onPressSelectMedia} />

        <SortableGrid
          itemsPerRow={3}
          onDragStart={onDragStart}
          onDragRelease={onDragRelease}
          dragStartAnimation={getDragStartAnimation()}
        >
          {data.map((d) => renderItem(d))}
        </SortableGrid>

        <View style={styles.flexContainer} />
        <View style={styles.row}>
          <Button title="Upload" onPress={onPressUpload} />
          {isUploading ? <ActivityIndicator /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
  },
  flexContainer: {
    flex: 1,
  },
  imageBackground: {
    flex: 1,
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  deleteIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteIconText: {
    fontWeight: '800',
  },
  iconText: {
    fontSize: 64,
    color: '#fff',
    fontWeight: '800',
  },
  progressBar: {
    position: 'absolute',
    bottom: 12,
    width: '80%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
